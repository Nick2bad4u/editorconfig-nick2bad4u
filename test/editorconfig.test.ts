import { parse } from "editorconfig";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { runEditorConfigCli } from "../src/cli.js";
import {
    type EditorConfigPreset,
    editorConfigPresets,
    getEditorConfigPresetPath,
    installEditorConfig,
    readEditorConfigPreset,
} from "../src/editorconfig.js";

const temporaryDirectories: string[] = [];

async function makeFixture(): Promise<string> {
    const fixture = await mkdtemp(path.join(tmpdir(), "editorconfig-preset-"));
    temporaryDirectories.push(fixture);
    return fixture;
}

afterEach(async () => {
    const directories = [...temporaryDirectories];
    temporaryDirectories.length = 0;
    await Promise.all(
        directories.map(async (directory) =>
            rm(directory, { force: true, recursive: true })
        )
    );
});

describe("editorConfig templates", () => {
    it.each(editorConfigPresets)(
        "ships a rooted %s template",
        async (preset) => {
            const contents = await readEditorConfigPreset(preset);

            expect(path.isAbsolute(getEditorConfigPresetPath(preset))).toBe(
                true
            );
            expect(contents).toMatch(/^root = true$/mv);
            expect(contents).toContain("charset = utf-8");
        }
    );

    it("installs and resolves the recommended four-space policy", async () => {
        const cwd = await makeFixture();
        const sourcePath = path.join(cwd, "src", "index.ts");
        const result = await installEditorConfig({ cwd });
        const properties = await parse(sourcePath);

        expect(result.written).toBe(true);
        expect(properties.indent_style).toBe("space");
        expect(properties.indent_size).toBe(4);
        expect(properties.end_of_line).toBe("lf");
    });

    it("supports a dry run without writing", async () => {
        const cwd = await makeFixture();
        const result = await installEditorConfig({
            cwd,
            dryRun: true,
            preset: "tabs",
        });

        expect(result).toMatchObject({ changed: true, written: false });
        await expect(readFile(path.join(cwd, ".editorconfig"))).rejects.toThrow(
            "ENOENT"
        );
    });

    it("refuses to overwrite user work unless force is explicit", async () => {
        const cwd = await makeFixture();
        const target = path.join(cwd, ".editorconfig");
        await writeFile(target, "root = true\n");

        await expect(
            installEditorConfig({ cwd, preset: "two-space" })
        ).rejects.toThrow("Refusing to overwrite");
        await expect(
            installEditorConfig({ cwd, force: true, preset: "two-space" })
        ).resolves.toMatchObject({ written: true });
    });

    it("rejects invented presets", () => {
        expect(() =>
            getEditorConfigPresetPath("python" as EditorConfigPreset)
        ).toThrow(RangeError);
    });

    it("runs the compiled init CLI", async () => {
        const cwd = await makeFixture();
        const cliPath = path.resolve("dist/bin.js");
        const result = spawnSync(
            process.execPath,
            [
                cliPath,
                "init",
                "--preset",
                "minimal",
            ],
            { cwd, encoding: "utf8" }
        );

        expect(result.status).toBe(0);
        expect(result.stdout).toContain("installed:");
        await expect(
            readFile(path.join(cwd, ".editorconfig"), "utf8")
        ).resolves.toBe(await readEditorConfigPreset("minimal"));
    });

    it("handles CLI options, output, and safe overwrite failures", async () => {
        const stdout: string[] = [];
        const stderr: string[] = [];
        vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
            stdout.push(String(chunk));
            return true;
        });
        vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
            stderr.push(String(chunk));
            return true;
        });

        const helpStatus = await runEditorConfigCli(["--help"]);
        const missingCommandStatus = await runEditorConfigCli([]);
        const invalidPresetStatus = await runEditorConfigCli([
            "init",
            "--preset",
            "invalid",
        ]);
        const unknownOptionStatus = await runEditorConfigCli([
            "init",
            "--unknown",
        ]);
        const stdoutStatus = await runEditorConfigCli([
            "init",
            "--stdout",
            "--preset",
            "tabs",
        ]);

        const cwd = await makeFixture();
        const dryRunStatus = await runEditorConfigCli(
            [
                "init",
                "--dry-run",
                "--preset",
                "minimal",
            ],
            cwd
        );
        const installStatus = await runEditorConfigCli(["init"], cwd);
        const matchingStatus = await runEditorConfigCli(["init"], cwd);
        await writeFile(path.join(cwd, ".editorconfig"), "root = false\n");
        const refusedStatus = await runEditorConfigCli(["init"], cwd);
        const forcedStatus = await runEditorConfigCli(["init", "--force"], cwd);

        const standardOutput = stdout.join("");
        const standardError = stderr.join("");

        expect({
            dryRunStatus,
            forcedStatus,
            helpStatus,
            installStatus,
            invalidPresetStatus,
            matchingStatus,
            missingCommandStatus,
            refusedStatus,
            stdoutStatus,
            unknownOptionStatus,
        }).toStrictEqual({
            dryRunStatus: 0,
            forcedStatus: 0,
            helpStatus: 0,
            installStatus: 0,
            invalidPresetStatus: 2,
            matchingStatus: 0,
            missingCommandStatus: 2,
            refusedStatus: 1,
            stdoutStatus: 0,
            unknownOptionStatus: 2,
        });
        expect(standardOutput).toContain("would update:");
        expect(standardOutput).toContain("installed:");
        expect(standardOutput).toContain("already matches:");
        expect(standardError).toContain("Expected the command");
        expect(standardError).toContain("Invalid preset");
        expect(standardError).toContain("Unknown option");
        expect(standardError).toContain("Refusing to overwrite");
    });
});

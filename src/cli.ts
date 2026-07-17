import { arrayFirst, arrayIncludes, arrayJoin, isDefined } from "ts-extras";

import {
    type EditorConfigPreset,
    editorConfigPresets,
    installEditorConfig,
    readEditorConfigPreset,
} from "./editorconfig.js";

const usage =
    "Usage: editorconfig-nick2bad4u init [options]\n\nOptions:\n  --preset <name>  four-space, two-space, tabs, or minimal\n  --force          replace an existing .editorconfig\n  --dry-run        report whether the file would change\n  --stdout         print the selected template without writing\n  --help           show this help\n";

interface EditorConfigCliOptions {
    readonly dryRun: boolean;
    readonly force: boolean;
    readonly preset: EditorConfigPreset;
    readonly stdout: boolean;
}

/** Run the package CLI and return an exit status. */
export async function runEditorConfigCli(
    args: readonly string[],
    cwd: string = process.cwd()
): Promise<number> {
    if (arrayIncludes(args, "--help") || arrayIncludes(args, "-h")) {
        process.stdout.write(usage);
        return 0;
    }

    if (arrayFirst(args) !== "init") {
        process.stderr.write(`${usage}\nExpected the command \`init\`.\n`);
        return 2;
    }

    const options = parseEditorConfigOptions(args);
    if (!isDefined(options)) return 2;

    if (options.stdout) {
        process.stdout.write(await readEditorConfigPreset(options.preset));
        return 0;
    }

    try {
        const result = await installEditorConfig({
            cwd,
            dryRun: options.dryRun,
            force: options.force,
            preset: options.preset,
        });
        const verb = getResultVerb(options.dryRun, result.written);
        process.stdout.write(
            `${verb}: ${result.targetPath} (${options.preset})\n`
        );
        return 0;
    } catch (error: unknown) {
        // eslint-disable-next-line unicorn/prefer-error-is-error -- Error.isError conflicts with the repository's no-extended-native rule
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`${message}\n`);
        return 1;
    }
}

function getResultVerb(isDryRun: boolean, isWritten: boolean): string {
    if (isDryRun) return "would update";
    return isWritten ? "installed" : "already matches";
}

function parseEditorConfigOptions(
    args: readonly string[]
): EditorConfigCliOptions | undefined {
    let preset: EditorConfigPreset = "four-space";
    let isForce = false;
    let isDryRun = false;
    let isStdout = false;

    for (let index = 1; index < args.length; index += 1) {
        const argument = args[index];

        if (argument === "--dry-run") {
            isDryRun = true;
        } else if (argument === "--force") {
            isForce = true;
        } else if (argument === "--preset") {
            const candidate = args[index + 1];
            if (
                !isDefined(candidate) ||
                !arrayIncludes(editorConfigPresets, candidate)
            ) {
                process.stderr.write(
                    `Invalid preset. Expected one of: ${arrayJoin(editorConfigPresets, ", ")}.\n`
                );
                return undefined;
            }
            preset = candidate;
            index += 1;
        } else if (argument === "--stdout") {
            isStdout = true;
        } else {
            process.stderr.write(`Unknown option: ${String(argument)}\n`);
            return undefined;
        }
    }

    return {
        dryRun: isDryRun,
        force: isForce,
        preset,
        stdout: isStdout,
    };
}

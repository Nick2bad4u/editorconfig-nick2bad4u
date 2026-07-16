import { readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { arrayIncludes, arrayJoin, isDefined, objectHasIn } from "ts-extras";

/** Copyable EditorConfig templates bundled by the package. */
export type EditorConfigPreset =
    | "four-space"
    | "minimal"
    | "tabs"
    | "two-space";

/** All bundled preset names in stable display order. */
export const editorConfigPresets: readonly EditorConfigPreset[] = Object.freeze(
    [
        "four-space",
        "two-space",
        "tabs",
        "minimal",
    ]
);

/** Options for copying one template into a consumer repository. */
export interface InstallEditorConfigOptions {
    readonly cwd?: string;
    readonly dryRun?: boolean;
    readonly force?: boolean;
    readonly preset?: EditorConfigPreset;
}

/** Result of an installation or dry run. */
export interface InstallEditorConfigResult {
    readonly changed: boolean;
    readonly preset: EditorConfigPreset;
    readonly targetPath: string;
    readonly written: boolean;
}

const presetPaths: Readonly<Record<EditorConfigPreset, string>> = {
    "four-space": fileURLToPath(
        new URL("../presets/four-space.editorconfig", import.meta.url)
    ),
    minimal: fileURLToPath(
        new URL("../presets/minimal.editorconfig", import.meta.url)
    ),
    tabs: fileURLToPath(
        new URL("../presets/tabs.editorconfig", import.meta.url)
    ),
    "two-space": fileURLToPath(
        new URL("../presets/two-space.editorconfig", import.meta.url)
    ),
};

const isPreset = (value: unknown): value is EditorConfigPreset =>
    arrayIncludes(editorConfigPresets, value);

/**
 * Return the absolute path to a copyable template.
 *
 * @throws {@link RangeError} If `preset` is not bundled.
 */
export function getEditorConfigPresetPath(
    preset: EditorConfigPreset = "four-space"
): string {
    if (!isPreset(preset)) {
        throw new RangeError(
            `Unknown EditorConfig preset: ${String(valueForMessage(preset))}. Expected one of: ${arrayJoin(editorConfigPresets, ", ")}.`
        );
    }
    return presetPaths[preset];
}

/**
 * Copy one preset to `<cwd>/.editorconfig`.
 *
 * Existing files are never overwritten unless `force` is explicit.
 *
 * @throws {@link Error} If a different file exists and `force` is not set.
 */
export async function installEditorConfig(
    options: InstallEditorConfigOptions = {}
): Promise<InstallEditorConfigResult> {
    const cwd = path.resolve(options.cwd ?? process.cwd());
    const preset = options.preset ?? "four-space";
    const targetPath = path.join(cwd, ".editorconfig");
    const contents = await readEditorConfigPreset(preset);
    const existing = await readExistingEditorConfig(targetPath);
    const isChanged = existing !== contents;

    if (isChanged && isDefined(existing) && options.force !== true) {
        throw new Error(
            `Refusing to overwrite existing EditorConfig: ${targetPath}. Pass force: true or --force to replace it.`
        );
    }

    if (isChanged && options.dryRun !== true) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed filename inside explicit consumer cwd
        await writeFile(targetPath, contents, { encoding: "utf8", flag: "w" });
    }

    return {
        changed: isChanged,
        preset,
        targetPath,
        written: isChanged && options.dryRun !== true,
    };
}

/** Read one template without installing it. */
export async function readEditorConfigPreset(
    preset: EditorConfigPreset = "four-space"
): Promise<string> {
    const presetPath = getEditorConfigPresetPath(preset);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- closed package-owned preset map
    return await readFile(presetPath, "utf8");
}

function isFileNotFoundError(error: unknown): boolean {
    return objectHasIn(error, "code") && error.code === "ENOENT";
}

async function readExistingEditorConfig(
    targetPath: string
): Promise<string | undefined> {
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixed filename inside explicit consumer cwd
        return await readFile(targetPath, "utf8");
    } catch (error: unknown) {
        if (isFileNotFoundError(error)) return undefined;
        throw error;
    }
}

function valueForMessage(value: unknown): unknown {
    return value;
}

# editorconfig-nick2bad4u

[![Continuous Integration](https://github.com/Nick2bad4u/editorconfig-nick2bad4u/actions/workflows/ci.yml/badge.svg)](https://github.com/Nick2bad4u/editorconfig-nick2bad4u/actions/workflows/ci.yml)

A safe, explicit installer for copyable EditorConfig templates.

## Why this is a generator

EditorConfig only searches for `.editorconfig` in a file's directory and its
ancestors. It cannot import settings from `node_modules`. This package therefore
copies a reviewed template into the consumer; it does not pretend to provide
live shared inheritance.

## Run without installing

```sh
npx editorconfig-nick2bad4u init --preset four-space
```

The installer refuses to overwrite an existing `.editorconfig` unless
`--force` is explicit.

## Presets

| Preset       | Policy                                                     |
| ------------ | ---------------------------------------------------------- |
| `four-space` | Default; four-space code/config and two-space Markdown.    |
| `two-space`  | Two-space web/Node defaults; four-space Python/PowerShell. |
| `tabs`       | Tabs for code, spaces for JSON/YAML/Markdown.              |
| `minimal`    | Encoding, LF, final newline, and trailing whitespace only. |

## CLI options

```text
editorconfig-nick2bad4u init --preset <name> [--force] [--dry-run] [--stdout]
```

- `--dry-run` reports whether the target would change.
- `--stdout` prints a template without touching the filesystem.
- `--force` is the only way to replace a different existing file.

## JavaScript API

```js
import {
 getEditorConfigPresetPath,
 installEditorConfig,
 readEditorConfigPreset,
} from "editorconfig-nick2bad4u";

const result = await installEditorConfig({
 cwd: process.cwd(),
 dryRun: true,
 preset: "two-space",
});

const source = await readEditorConfigPreset("minimal");
const templatePath = getEditorConfigPresetPath("tabs");
```

## Updating consumers

Because the installed `.editorconfig` is owned by the consumer, package updates
do not rewrite it. Review a new template with `--stdout` or `--dry-run`, then use
`--force` only after reviewing the intended replacement.

## Requirements

- Node.js `^22.22.3`, `^24.16.0`, or `>=26.3.0`

## License

[MIT](LICENSE)

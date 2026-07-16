# Repository Instructions

This repository publishes `editorconfig-nick2bad4u` as a template installer.

## Public surfaces

- Treat `.editorconfig`, `presets/`, the typed API, and CLI behavior as public.
- Never claim EditorConfig can extend a package from `node_modules`.
- Refuse overwrite by default and keep dry-run/stdout non-mutating.
- Keep templates valid for real EditorConfig resolution.

## Verification

Run `npm run release:verify`, including parser resolution, overwrite safety, the
compiled CLI, editorconfig-checker, and packed bin metadata.

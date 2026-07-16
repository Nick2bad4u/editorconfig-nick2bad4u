#!/usr/bin/env node

import { runEditorConfigCli } from "./cli.js";

void runEditorConfigCli(process.argv.slice(2)).then((status) => {
    process.exitCode = status;
    return status;
});

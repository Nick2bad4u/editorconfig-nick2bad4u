#!/usr/bin/env node

import { runEditorConfigCli } from "./cli.js";

process.exitCode = await runEditorConfigCli(process.argv.slice(2));

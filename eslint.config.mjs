import nickTwoBadFourU from "eslint-config-nick2bad4u";

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...nickTwoBadFourU.configs.all,

    {
        files: ["src/**/*.ts"],
        rules: { "import-x/extensions": "off" },
    },
    {
        files: ["src/cli.ts"],
        rules: {
            // A switch here conflicts with the no-break-in-nested-loop rule.
            "unicorn/prefer-switch": "off",
        },
    },
    {
        files: ["src/bin.ts"],
        rules: {
            // The published dist/bin.js is the package executable.
            "n/hashbang": "off",
        },
    },
    {
        files: ["test/**/*.ts"],
        rules: {
            "vitest/no-hooks": "off",
            "vitest/prefer-expect-assertions": "off",
            "vitest/require-top-level-describe": "off",
        },
    },
];

export default config;

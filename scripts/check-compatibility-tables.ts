/* eslint-disable no-console */
/**
 * @file Very simple script to validate the compatibility tables.
 */

import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { join } from 'path';
import yaml from 'js-yaml';
import ss from 'superstruct';

/**
 * List of all supported platforms and shortcuts.
 */
const platforms = ss.enums([
    // Platforms
    'adg_os_windows',
    'adg_os_mac',
    'adg_os_android',
    'adg_ext_chrome',
    'adg_ext_opera',
    'adg_ext_edge',
    'adg_ext_firefox',
    'adg_cb_android',
    'adg_cb_ios',
    'adg_cb_safari',
    'ubo_ext_chrome',
    'ubo_ext_firefox',
    'ubo_ext_opera',
    'ubo_ext_edge',
    'abp_ext_chrome',
    'abp_ext_firefox',
    'abp_ext_opera',
    'abp_ext_edge',

    // Shortcuts for platforms
    'any',
    'adg_any',
    'adg_os_any',
    'adg_ext_any',
    'adg_ext_chromium',
    'adg_cb_any',
    'adg_any_not_cb',
    'ubo_any',
    'ubo_ext_any',
    'ubo_ext_chromium',
    'abp_any',
    'abp_ext_any',
    'abp_ext_chromium',
]);

/**
 * Schema for compatibility tables.
 *
 * The keys are glob patterns for the files to be checked.
 * The values are Superstruct schemas for the files.
 */
const SCHEMA_MAP = {
    // https://github.com/AdguardTeam/AGLint/tree/master/src/compatibility-tables/modifiers#file-structure
    'src/compatibility-tables/modifiers/**.yml': ss.record(platforms, ss.refine(
        ss.object({
            name: ss.nonempty(ss.string()),
            aliases: ss.defaulted(ss.array(ss.nonempty(ss.string())), []),
            description: ss.nullable(ss.string()),
            docs: ss.defaulted(ss.nullable(ss.nonempty(ss.string())), null),
            version_added: ss.defaulted(ss.nullable(ss.nonempty(ss.string())), null),
            version_removed: ss.defaulted(ss.nullable(ss.nonempty(ss.string())), null),
            deprecated: ss.defaulted(ss.boolean(), false),
            deprecation_message: ss.defaulted(ss.nullable(ss.nonempty(ss.string())), null),
            conflicts: ss.defaulted(ss.array(ss.nonempty(ss.string())), []),
            inverse_conflicts: ss.defaulted(ss.boolean(), false),
            assignable: ss.defaulted(ss.boolean(), false),
            value_format: ss.defaulted(ss.nullable(ss.nonempty(ss.string())), null),
            negatable: ss.defaulted(ss.boolean(), true),
            block_only: ss.defaulted(ss.boolean(), false),
            exception_only: ss.defaulted(ss.boolean(), false),
        }),
        'modifier',
        // Additional checks
        (config) => {
            // `block_only` and `exception_only` are mutually exclusive, so they can't be both true
            if (config.block_only && config.exception_only) {
                return 'block_only and exception_only are mutually exclusive';
            }
            return true;
        },
    )),
};

/**
 * List of all problems found in the compatibility tables.
 * We don't throw an error immediately because we want to check all files.
 */
const problems: { [key: string]: string[] } = {};

for (const [globPattern, schema] of Object.entries(SCHEMA_MAP)) {
    // Get all files matching the glob pattern
    const files = globSync(globPattern);

    for (const file of files) {
        // Get file contents
        const content = readFileSync(file, 'utf8');

        try {
            // Parse YAML to object (throws if the YAML syntax is invalid)
            const data = yaml.load(content);

            // Validate the object against the schema (throws if the object is invalid)
            // Needs to use 'create' instead of 'assert' because we want to set the
            // default values for optional properties.
            ss.create(data, schema);
        } catch (error: unknown) {
            if (error instanceof Error) {
                if (file in problems) {
                    problems[file].push(error.message);
                } else {
                    problems[file] = [error.message];
                }
            } else {
                // Unknown error, abort the script
                throw error;
            }
        }
    }
}

// Print the results
if (Object.keys(problems).length === 0) {
    console.log('All compatibility tables are valid.');
} else {
    console.error('The following compatibility tables are invalid:');

    for (const [file, errors] of Object.entries(problems)) {
        console.error(`  ${join(file)}:`);
        for (const error of errors) {
            console.error(`    - ${error}`);
        }
    }

    // Exit with error code 1 (so that the CI fails)
    process.exit(1);
}
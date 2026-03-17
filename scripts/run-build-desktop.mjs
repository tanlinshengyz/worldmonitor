#!/usr/bin/env node
/**
 * Run desktop build steps in sequence: sidecar-sebuf, sidecar-handlers, tsc, vite build.
 * Avoids "spawn ... ENOENT" on Windows when the command is run without a shell.
 */
import { execSync } from 'node:child_process';

const commands = [
  'node scripts/build-sidecar-sebuf.mjs',
  'node scripts/build-sidecar-handlers.mjs',
  'npx tsc',
  'npx vite build',
];

for (const cmd of commands) {
  execSync(cmd, { stdio: 'inherit', shell: true });
}

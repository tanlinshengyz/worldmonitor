#!/usr/bin/env node
/**
 * Run tsc then vite build in sequence. Used so the build script is a single
 * command and avoids "spawn tsc && vite build ENOENT" on Windows when tools
 * (e.g. cross-spawn) run the script without a shell.
 */
import { execSync } from 'node:child_process';

const commands = [
  ['npx', 'tsc'],
  ['npx', 'vite', 'build'],
];

for (const cmd of commands) {
  execSync(cmd.join(' '), { stdio: 'inherit', shell: true });
}

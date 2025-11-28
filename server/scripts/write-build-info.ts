#!/usr/bin/env tsx

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function getGitCommitShort(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return sha;
  } catch {
    return process.env.GIT_COMMIT || 'unknown';
  }
}

function main() {
  const buildInfo = {
    commit: getGitCommitShort(),
    buildTime: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV || 'production',
  };

  const outPath = path.resolve(process.cwd(), '.build-info.json');
  fs.writeFileSync(outPath, JSON.stringify(buildInfo, null, 2));
  // eslint-disable-next-line no-console
  console.log(`[build-info] Wrote ${outPath}:`, buildInfo);
}

main();



import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const router = Router();

function readBuildInfo() {
  try {
    const file = path.resolve(process.cwd(), '.build-info.json');
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return null;
}

router.get('/', (_req, res) => {
  const info = readBuildInfo();
  res.json({
    commit: info?.commit || process.env.GIT_COMMIT || 'unknown',
    buildTime: info?.buildTime || null,
    env: process.env.NODE_ENV || 'production',
    uptimeSec: Math.round(process.uptime()),
  });
});

export default router;



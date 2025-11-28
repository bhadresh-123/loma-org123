import 'dotenv/config';
import { startBrowserbaseSession } from './start-session.js';
import { adaptCvToProfile } from './cv-adapter.js';
import { logInfo } from './logger.js';
import { runAutofillOnSession } from './runner.js';

// For dev: simulate CV JSON via --cv path
async function readCvFromArg(): Promise<any> {
  const pathArg = process.argv.find((a) => a.startsWith('--cv='));
  if (!pathArg) return {};
  const fs = await import('node:fs/promises');
  const path = pathArg.split('=')[1];
  const raw = await fs.readFile(path, 'utf-8');
  return JSON.parse(raw);
}

async function main() {
  const cv = await readCvFromArg();
  const profile = adaptCvToProfile(cv);
  logInfo('Profile prepared');

  const session = await startBrowserbaseSession();
  console.log('Live View:', session.liveViewUrl);
  // Optional: immediately run the autofill to fill registration form
  if (process.argv.includes('--run')) {
    console.log('Filling CAQH registration form in Live View...');
    await runAutofillOnSession(session.sessionId, cv);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


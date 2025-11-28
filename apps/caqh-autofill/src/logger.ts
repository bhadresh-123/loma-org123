/* Minimal redacted logger for experiment runs */
export function logInfo(message: string, meta?: Record<string, unknown>) {
  console.log(`[CAQH] ${message}`, redact(meta));
}

export function logWarn(message: string, meta?: Record<string, unknown>) {
  console.warn(`[CAQH] ${message}`, redact(meta));
}

export function logError(message: string, meta?: Record<string, unknown>) {
  console.error(`[CAQH] ${message}`, redact(meta));
}

function redact(meta?: Record<string, unknown>) {
  if (!meta) return undefined;
  const clone: Record<string, unknown> = { ...meta };
  for (const key of Object.keys(clone)) {
    if (/password|ssn|secret|token|email|phone/i.test(key)) {
      clone[key] = '[REDACTED]';
    }
  }
  return clone;
}


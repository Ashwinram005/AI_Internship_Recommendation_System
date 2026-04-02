/**
 * Stops any process listening on SKILL_EXTRACTOR_PORT (default 8765)
 * so `npm run skill-server` can bind without Windows Errno 10048.
 */
import { execSync } from 'node:child_process';
import process from 'node:process';

const port = process.env.SKILL_EXTRACTOR_PORT || '8765';

function freeWindows() {
  let out = '';
  try {
    out = execSync('netstat -ano', { encoding: 'utf8' });
  } catch {
    return;
  }
  const pids = new Set();
  const needle = `:${port}`;
  for (const line of out.split(/\r?\n/)) {
    if (!line.includes('LISTENING') || !line.includes(needle)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) pids.add(pid);
  }
  for (const pid of pids) {
    console.error(`[skill-server] Port ${port} in use by PID ${pid}; stopping it so this server can start.`);
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'inherit' });
    } catch {
      // ignore — process may have exited
    }
  }
}

function freeUnix() {
  try {
    execSync(
      `sh -c 'pid=$(lsof -ti:${port} -sTCP:LISTEN 2>/dev/null); if [ -n "$pid" ]; then echo "[skill-server] Port ${port} in use by PID $pid; stopping."; kill -9 $pid; fi'`,
      { stdio: 'inherit' },
    );
  } catch {
    // lsof/kill fails if nothing on port
  }
}

if (process.platform === 'win32') freeWindows();
else freeUnix();

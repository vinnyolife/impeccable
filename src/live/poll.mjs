/**
 * CLI client for the live variant mode poll/reply protocol.
 *
 * Usage:
 *   npx impeccable poll                         # Block until browser event, print JSON
 *   npx impeccable poll --timeout=60000         # Custom timeout (ms)
 *   npx impeccable poll --reply <id> done       # Reply "done" to event <id>
 *   npx impeccable poll --reply <id> error "msg" # Reply with error
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const LIVE_PID_FILE = path.join(os.tmpdir(), 'impeccable-live.json');

function readServerInfo() {
  try {
    return JSON.parse(fs.readFileSync(LIVE_PID_FILE, 'utf-8'));
  } catch {
    console.error('No running live server found. Start one with: npx impeccable live');
    process.exit(1);
  }
}

export async function pollCli() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Usage: impeccable poll [options]

Wait for a browser event from the live variant server, or reply to one.

Modes:
  poll                             Block until a browser event arrives, print JSON
  poll --reply <id> done           Reply "done" to event <id>
  poll --reply <id> error "msg"    Reply with an error message

Options:
  --timeout=MS   Poll timeout in milliseconds (default: 120000)
  --help         Show this help message`);
    process.exit(0);
  }

  const info = readServerInfo();
  const base = `http://localhost:${info.port}`;

  // Reply mode: npx impeccable poll --reply <id> <status> [--file path] [message]
  const replyIdx = args.indexOf('--reply');
  if (replyIdx !== -1) {
    const id = args[replyIdx + 1];
    const status = args[replyIdx + 2] || 'done';
    const fileIdx = args.indexOf('--file');
    const filePath = fileIdx !== -1 && fileIdx + 1 < args.length ? args[fileIdx + 1] : undefined;
    // Message is any remaining positional arg that isn't a flag
    const message = args.find((a, i) => i > replyIdx + 2 && !a.startsWith('--') && i !== fileIdx + 1) || undefined;

    if (!id) {
      console.error('Usage: npx impeccable poll --reply <id> <status> [--file path] [message]');
      process.exit(1);
    }

    try {
      const res = await fetch(`${base}/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: info.token,
          id,
          type: status,
          message,
          file: filePath,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`Reply failed (${res.status}):`, body.error || res.statusText);
        process.exit(1);
      }

      // Success — silent exit (agent doesn't need output for replies)
    } catch (err) {
      if (err.cause?.code === 'ECONNREFUSED') {
        console.error('Live server not running. Start one with: npx impeccable live');
      } else {
        console.error('Reply failed:', err.message);
      }
      process.exit(1);
    }
    return;
  }

  // Poll mode: block until browser event
  const timeoutArg = args.find(a => a.startsWith('--timeout='));
  const timeout = timeoutArg ? parseInt(timeoutArg.split('=')[1], 10) : 120000;

  try {
    const res = await fetch(`${base}/poll?token=${info.token}&timeout=${timeout}`);

    if (res.status === 401) {
      console.error('Authentication failed. The server token may have changed.');
      console.error('Try restarting: npx impeccable live stop && npx impeccable live');
      process.exit(1);
    }

    if (!res.ok) {
      console.error(`Poll failed: ${res.status} ${res.statusText}`);
      process.exit(1);
    }

    const event = await res.json();
    // Print the event as JSON — the agent reads this from stdout
    console.log(JSON.stringify(event));
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.error('Live server not running. Start one with: npx impeccable live');
    } else {
      console.error('Poll failed:', err.message);
    }
    process.exit(1);
  }
}

// Headless Chrome over the DevTools protocol, for the script that captures the Voga demo.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts Chrome on `port`; `send` runs a DevTools command on its page, `close` quits and removes the profile. */
export async function openChrome(port) {
	const profile = mkdtempSync(join(tmpdir(), 'chrome-'));
	const chrome = spawn(CHROME, ['--headless=new', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
	let targets;
	for (let i = 0; i < 50 && !targets; i++) {
		try {
			targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
		} catch {
			await sleep(200);
		}
	}
	const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
	await new Promise((resolve) => ws.addEventListener('open', resolve));
	let nextId = 0;
	const pending = new Map();
	ws.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);
		pending.get(message.id)?.(message);
		pending.delete(message.id);
	});
	const send = (method, params = {}) =>
		new Promise((resolve) => {
			const id = ++nextId;
			pending.set(id, resolve);
			ws.send(JSON.stringify({ id, method, params }));
		});
	const close = () => {
		ws.close();
		// A Chrome profile weighs ~100 MB
		chrome.on('exit', () => rmSync(profile, { recursive: true, force: true }));
		chrome.kill();
	};
	return { send, close };
}

// Captures the site's screenshots of the Voga demo (fictional people and outlets), in Portuguese,
// in both themes: site/screenshots/{name}-{light|dark}.webp, 1440×900 at 2x.
//
// In the app repo, build the demo: `cd frontend && pnpm build:mock` (it writes out-mock/). Then, here:
//   node scripts/screenshots.mjs ../voga/frontend/out-mock [name…]
// The script serves that folder itself. CHROME points to another browser.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { openChrome, sleep } from './chrome.mjs';

const [demoDir, ...only] = process.argv.slice(2);
if (!demoDir || !existsSync(join(demoDir, 'index.html'))) {
	console.error('Usage: node scripts/screenshots.mjs <app>/frontend/out-mock [name…]');
	process.exit(1);
}
const OUT = new URL('../site/screenshots/', import.meta.url);
const PORT = 3129;

/** The demo's politics investigation, open on its own. */
const POLITICS = { kind: 'investigation', ids: ['inv-demo'] };

/**
 * name → the demo page, what is open in it (the app's `voga.context`: one investigation, several
 * compared, or null for Home) and what to do there before the capture.
 */
const VIEWS = {
	claims: { path: '/claims', context: POLITICS },
	map: { path: '/map', context: POLITICS, settle: 7000, after: openCompany },
	live: { path: '/live', context: POLITICS, run: startLiveSession, settle: 26000 },
	home: { path: '/', context: null },
	// Two politicians: Marina Exemplo and the mayor Helena Prado share a company (Gráfica Exemplo Ltda)
	compare: { path: '/compare', context: { kind: 'investigation', ids: ['inv-demo', 'inv-prefeita'] }, settle: 2000 },
};

/** Starts a live session in the demo, which then acts out a short debate. */
async function startLiveSession(send) {
	await clickButton(send, /^Nova sessão/);
	await sleep(1500);
	await clickButton(send, /^Começar a ouvir/);
}

/**
 * Opens the panel of the demo's biggest supplier. The force layout differs on every load, so it is
 * found on the canvas: a point whose neighbours 30px away are all the company color (#b45309) can
 * only be inside the biggest node.
 */
async function openCompany(send) {
	const { result } = await send('Runtime.evaluate', {
		returnByValue: true,
		expression: `(() => {
			const canvas = document.querySelector('canvas');
			const { width, height } = canvas;
			const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
			const company = (x, y) => { const i = (y * width + x) * 4; return Math.abs(data[i] - 180) + Math.abs(data[i + 1] - 83) + Math.abs(data[i + 2] - 9) < 30; };
			for (let y = 30; y < height - 30; y += 4)
				for (let x = 30; x < width - 30; x += 4)
					if (company(x, y) && company(x + 30, y) && company(x - 30, y) && company(x, y + 30) && company(x, y - 30)) {
						const rect = canvas.getBoundingClientRect();
						return { x: rect.left + (x / width) * rect.width, y: rect.top + (y / height) * rect.height };
					}
			return null;
		})()`,
	});
	const point = result.result.value;
	if (!point) return console.warn('map: no company node found to open');
	for (const type of ['mousePressed', 'mouseReleased']) {
		await send('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 });
	}
	await sleep(1500);
	// The demo answers with the company's Receita record, partners and sanctions
	await clickButton(send, /^Buscar dados públicos/);
	await sleep(3000);
}

async function clickButton(send, pattern) {
	await send('Runtime.evaluate', {
		expression: `[...document.querySelectorAll('button')].find(b => ${pattern}.test(b.textContent.trim()))?.click()`,
	});
}

/** The demo is a static export: /claims is claims.html. */
const root = resolve(demoDir);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };
const server = createServer((req, res) => {
	const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
	const file = [path, `${path}.html`, join(path, 'index.html')].map(p => join(root, p)).find(p => p.startsWith(root) && existsSync(p) && statSync(p).isFile());
	if (!file) return res.writeHead(404).end();
	res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
}).listen(PORT);

const { send, close } = await openChrome(9342);
await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
try {
	for (const theme of ['light', 'dark']) {
		for (const [name, view] of Object.entries(VIEWS)) {
			if (only.length && !only.includes(name)) continue;
			// The app keeps its language, theme and what is open in localStorage
			const { identifier } = (await send('Page.addScriptToEvaluateOnNewDocument', {
				source: `localStorage.setItem('voga.uiLanguage', 'pt-BR'); localStorage.setItem('app-theme', '${theme}'); localStorage.setItem('voga.context', ${JSON.stringify(JSON.stringify(view.context))});`,
			})).result;
			await send('Page.navigate', { url: `http://localhost:${PORT}${view.path}` });
			await sleep(3500);
			if (view.run) await view.run(send);
			await sleep(view.settle ?? 0);
			if (view.after) await view.after(send);
			const shot = await send('Page.captureScreenshot', { format: 'webp', quality: 82 });
			const file = `${name}-${theme}.webp`;
			writeFileSync(new URL(file, OUT), Buffer.from(shot.result.data, 'base64'));
			console.log(file);
			await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
		}
	}
} finally {
	close();
	server.close();
}

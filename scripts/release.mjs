// Publishes a built Voga version as a GitHub release of feliperohde/voga: the .dmg people download
// from the site, and the updater's files (Voga.app.tar.gz, its .sig and latest.json) the app checks.
//
// In the app repo, first: bump the version and write its RELEASE_NOTES.md entry, then
// `cd frontend && pnpm tauri:build` (the standard build, named Voga). Then, here:
//   node scripts/release.mjs [app repo, default ../voga] [--dry-run]
// --dry-run checks the files and prints the gh command without running it. Needs `gh auth login`.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO = 'feliperohde/voga';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const app = resolve(args.find((arg) => !arg.startsWith('--')) ?? '../voga');

const fail = (message) => {
	console.error(`✗ ${message}`);
	process.exit(1);
};

const conf = join(app, 'frontend/src-tauri/tauri.conf.json');
if (!existsSync(conf)) fail(`not the Voga app repo: ${conf} is missing`);
const { version } = JSON.parse(readFileSync(conf, 'utf8'));
const tag = `v${version}`;

const bundle = join(app, 'target/release/bundle');
const dmg = join(bundle, 'dmg', `Voga_${version}_aarch64.dmg`);
const updater = join(bundle, 'macos/Voga.app.tar.gz');
if (!existsSync(dmg)) {
	const found = existsSync(join(bundle, 'dmg')) ? readdirSync(join(bundle, 'dmg')).filter((name) => name.endsWith('.dmg')) : [];
	fail(`${dmg} is missing (found: ${found.join(', ') || 'no .dmg'}). Build ${version} with pnpm tauri:build`);
}
if (!existsSync(updater) || !existsSync(`${updater}.sig`)) fail(`${updater} and its .sig are missing: the build signs them with ~/.voga/updater.key`);
// The updater's archive is packed from this .app: it must be the version being released
const plist = join(bundle, 'macos/Voga.app/Contents/Info.plist');
const built = existsSync(plist) ? execFileSync('plutil', ['-extract', 'CFBundleShortVersionString', 'raw', plist], { encoding: 'utf8' }).trim() : 'unknown';
if (built !== version) fail(`the app in ${join(bundle, 'macos')} is version ${built}, not ${version}: build again`);

// The version's entry in RELEASE_NOTES.md ("## [x.y.z] - date" up to the next "## [")
const lines = readFileSync(join(app, 'RELEASE_NOTES.md'), 'utf8').split('\n');
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) fail(`RELEASE_NOTES.md has no "## [${version}]" entry`);
const end = lines.findIndex((line, i) => i > start && line.startsWith('## ['));
const notes = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();

const work = mkdtempSync(join(tmpdir(), 'voga-release-'));
const notesFile = join(work, 'notes.md');
writeFileSync(notesFile, `${notes}\n\n---\nPara Mac com Apple Silicon. Como instalar: https://feliperohde.github.io/voga/#instalar\n`);

// latest.json, by the app's own script: it points the updater at this tag's Voga.app.tar.gz
const manifest = join(work, 'latest.json');
execFileSync('node', [join(app, 'scripts/generate-update-manifest-github.js'), version, join(bundle, 'macos'), manifest], { stdio: ['ignore', 'ignore', 'inherit'] });
const { platforms } = JSON.parse(readFileSync(manifest, 'utf8'));
const target = platforms['darwin-aarch64'];
if (!target?.signature || !target.url.endsWith(`/download/${tag}/Voga.app.tar.gz`)) fail(`unexpected latest.json: ${JSON.stringify(platforms)}`);

const ghArgs = ['release', 'create', tag, '--repo', REPO, '--title', `Voga ${version}`, '--notes-file', notesFile,
	`${dmg}#Voga ${version} para Mac (Apple Silicon)`, updater, `${updater}.sig`, manifest];

if (dryRun) {
	console.log(`\nWould run:\ngh ${ghArgs.map((arg) => (/\s/.test(arg) ? JSON.stringify(arg) : arg)).join(' ')}\n\nNotes (${notesFile}):\n${notes.slice(0, 400)}…`);
	process.exit(0);
}

// A published version is never replaced: the updater and people's downloads already point at it
try {
	execFileSync('gh', ['release', 'view', tag, '--repo', REPO], { stdio: 'ignore' });
	fail(`${tag} is already released on ${REPO}. Bump the version for a new one`);
} catch (error) {
	if (error.status === undefined) throw error;
}
execFileSync('gh', ghArgs, { stdio: 'inherit' });
console.log(`✓ https://github.com/${REPO}/releases/tag/${tag}`);

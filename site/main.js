// The theme toggle, the phone menu, and the download buttons, which point at the latest release's
// files on GitHub: [data-download] at the visitor's system, [data-download="mac|windows|deb|appimage"]
// at that file. Without JavaScript (or when GitHub doesn't answer) they open the releases page.

const REPO = 'feliperohde/voga';
const THEME_KEY = 'voga-site-theme';

// Each download: the release file it points at, and for a visitor's system, its button and requirement
const DOWNLOADS = {
	mac: { file: /aarch64\.dmg$/, label: 'Baixar para Mac', requirement: 'Mac com Apple Silicon (M1 ou mais novo)' },
	windows: { file: /-setup\.exe$/, label: 'Baixar para Windows', requirement: 'Windows 10 ou 11, 64 bits' },
	deb: { file: /\.deb$/, label: 'Baixar para Linux', requirement: 'Linux de 64 bits, .deb para Ubuntu, Debian e Mint (AppImage em Instalar)' },
	appimage: { file: /\.AppImage$/ },
};

// Phones and anything unknown get the Mac's, as before there were others
function visitorDownload() {
	const platform = navigator.userAgentData?.platform || navigator.userAgent;
	if (/Android|iPhone|iPad|CrOS/i.test(platform)) return 'mac';
	if (/Win/i.test(platform)) return 'windows';
	if (/Linux|X11/i.test(platform)) return 'deb';
	return 'mac';
}
const visitor = visitorDownload();
const REQUIREMENT = DOWNLOADS[visitor].requirement;
const linksTo = (name) => document.querySelectorAll(name ? `[data-download="${name}"]` : '[data-download=""]');
for (const link of linksTo()) link.textContent = DOWNLOADS[visitor].label;
// In Instalar, the visitor's system is the primary button
for (const name of Object.keys(DOWNLOADS)) for (const link of linksTo(name)) link.classList.toggle('secondary', name !== visitor);

const root = document.documentElement;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = () => root.dataset.theme ?? (systemDark.matches ? 'dark' : 'light');

const toggle = document.querySelector('[data-theme-toggle]');
function labelToggle() {
	toggle.setAttribute('aria-label', currentTheme() === 'dark' ? 'Usar o tema claro' : 'Usar o tema escuro');
}
toggle.addEventListener('click', () => {
	const next = currentTheme() === 'dark' ? 'light' : 'dark';
	root.dataset.theme = next;
	try {
		localStorage.setItem(THEME_KEY, next);
	} catch {
		// Private windows can refuse storage: the theme still changes for this visit
	}
	labelToggle();
});
systemDark.addEventListener('change', labelToggle);
labelToggle();

// A link in the menu jumps to its section: close the menu behind it
const menu = document.querySelector('.menu');
menu.addEventListener('click', (event) => {
	if (event.target.closest('a')) menu.open = false;
});
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && menu.open) {
		menu.open = false;
		menu.querySelector('summary').focus();
	}
});

const meta = document.querySelector('[data-release-meta]');
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const sizeFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

async function findLatestRelease() {
	meta.textContent = `Procurando a versão mais recente… · ${REQUIREMENT}`;
	try {
		const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
		if (response.status === 404) {
			meta.textContent = `A primeira versão ainda não foi publicada. O botão abre a página de versões no GitHub. · ${REQUIREMENT}`;
			return;
		}
		if (!response.ok) throw new Error(`GitHub: ${response.status}`);
		const release = await response.json();
		// A file missing from the release keeps its links on the releases page
		const files = {};
		for (const [name, { file }] of Object.entries(DOWNLOADS)) {
			files[name] = release.assets.find((asset) => file.test(asset.name));
			for (const link of linksTo(name)) if (files[name]) link.href = files[name].browser_download_url;
		}
		const mine = files[visitor];
		if (!mine) throw new Error(`no ${visitor} file in the latest release`);
		for (const link of linksTo()) link.href = mine.browser_download_url;
		const version = release.tag_name.replace(/^v/, '');
		const date = dateFormat.format(new Date(release.published_at));
		meta.textContent = `Versão ${version}, de ${date} · ${sizeFormat.format(mine.size / 1e6)} MB · ${REQUIREMENT}`;
	} catch {
		meta.textContent = `Não consegui consultar a versão mais recente agora. O botão abre a página de versões no GitHub. · ${REQUIREMENT}`;
	}
}

findLatestRelease();

// The theme toggle, the phone menu, and the download buttons, which point at the .dmg of the latest
// release on GitHub. Without JavaScript (or when GitHub doesn't answer) they open the releases page.

const REPO = 'feliperohde/voga';
const THEME_KEY = 'voga-site-theme';
const REQUIREMENT = 'Mac com Apple Silicon (M1 ou mais novo)';

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

async function findLatestDmg() {
	meta.textContent = `Procurando a versão mais recente… · ${REQUIREMENT}`;
	try {
		const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
		if (response.status === 404) {
			meta.textContent = `A primeira versão ainda não foi publicada. O botão abre a página de versões no GitHub. · ${REQUIREMENT}`;
			return;
		}
		if (!response.ok) throw new Error(`GitHub: ${response.status}`);
		const release = await response.json();
		const dmgs = release.assets.filter((asset) => asset.name.endsWith('.dmg'));
		const dmg = dmgs.find((asset) => /aarch64|arm64/.test(asset.name)) ?? dmgs[0];
		if (!dmg) throw new Error('no .dmg in the latest release');
		for (const link of document.querySelectorAll('[data-download]')) link.href = dmg.browser_download_url;
		const version = release.tag_name.replace(/^v/, '');
		const date = dateFormat.format(new Date(release.published_at));
		meta.textContent = `Versão ${version}, de ${date} · ${sizeFormat.format(dmg.size / 1e6)} MB · ${REQUIREMENT}`;
	} catch {
		meta.textContent = `Não consegui consultar a versão mais recente agora. O botão abre a página de versões no GitHub. · ${REQUIREMENT}`;
	}
}

findLatestDmg();

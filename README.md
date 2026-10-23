# Voga

O Voga é um app para Mac que acompanha políticos brasileiros. Ele junta discursos, entrevistas, vídeos, notícias e os dados oficiais da Câmara, do Senado e do TSE sobre quem você acompanha, e aponta onde uma promessa foi cumprida ou contradita, com o registro ao lado. O que a IA encontra é sugestão: só conta o que você confirmar.

**Site:** https://feliperohde.github.io/voga/

## Baixar

A versão mais recente fica em [Releases](https://github.com/feliperohde/voga/releases/latest): baixe o arquivo `.dmg`. É para Mac com Apple Silicon (M1 ou mais novo).

1. Abra o `.dmg` e arraste o Voga para a pasta Aplicativos.
2. O Voga ainda não é autenticado pela Apple, então na primeira vez o macOS avisa que não consegue verificá-lo. Clique em OK, abra Ajustes do Sistema › Privacidade e Segurança e clique em **Abrir Mesmo Assim**. Pelo Terminal:
   ```bash
   xattr -dr com.apple.quarantine /Applications/Voga.app
   ```
3. Na tela inicial, baixe os modelos de IA que rodam no computador ou conecte a IA que você já usa.

Depois disso, o Voga procura versões novas sozinho ao abrir.

Os outros arquivos de cada versão (`Voga.app.tar.gz`, `.sig` e `latest.json`) são das atualizações automáticas: não é preciso baixá-los.

## O que há neste repositório

O código do app ainda não é público. Este repositório tem o site (pasta `site/`) e as versões do app, em Releases. Os arquivos "Source code" de cada versão, que o GitHub cria sozinho, contêm só o site.

© 2026 Felipe Rohde. Todos os direitos reservados. As fontes em `site/fonts/` são da Adobe, sob a SIL Open Font License 1.1 (`site/fonts/LICENSE.txt`).

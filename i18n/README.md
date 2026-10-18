# Traduções da vitrine

Cada idioma tem um arquivo JSON nesta pasta. O inglês (`en.json`) é a base e o idioma padrão. Português está em `pt.json`.

## Adicionar um idioma

1. Faça um fork e copie `en.json` para um novo arquivo, por exemplo `es.json`.
2. Altere apenas os metadados e os textos. Para espanhol, use:

```json
"meta": {
  "code": "es",
  "name": "Español",
  "locale": "es-ES",
  "direction": "ltr"
}
```

3. Traduza os valores de `messages`, mantendo todas as chaves. O arquivo concentra navegação, controles, descrições dos 19 modelos, os 11 capítulos completos, receitas, materiais, tabelas, acessibilidade e mensagens.
4. Preserve os marcadores `{name}`, `{count}`, `{layer}`, etc. As formas plurais são objetos com `one` e `other`; podem ser adicionadas `zero`, `two`, `few` e `many`, conforme as regras de `Intl.PluralRules` do idioma.
5. Preserve os códigos Minecraft `§b`, `§r` etc., que indicam cores e estilos nos textos do guia.
6. Em `references.aliases`, mantenha os IDs e traduza as palavras dos arrays. São sinônimos usados para reconhecer itens nos textos. Em `excludedAliases`, traduza os termos genéricos que não devem receber dicas. Os nomes traduzidos dos itens também são reconhecidos automaticamente.
7. Rode `node scripts/build-i18n.mjs` e `node --test tests/i18n.test.mjs tests/public-project-data.test.cjs`.
8. Confira `index.html?lang=es` e `guia.html?lang=es`, e envie um pull request contendo `i18n/es.json`.

**Nenhuma alteração em JavaScript, HTML, menu ou lista de idiomas é necessária.** Após o merge na branch padrão, o workflow descobre todos os JSONs, valida os arquivos, gera o catálogo de idiomas e publica o site. O novo idioma aparece automaticamente no seletor.

Chaves ausentes ou valores vazios usam o texto inglês. Assim, traduções parciais funcionam; traduções de plurais precisam da forma `other`. A validação impede JSON inválido, código incompatível com o nome do arquivo, chaves desconhecidas e marcadores divergentes.

Os valores de `meta.name` aparecem no menu no próprio idioma, como Español ou Français. Use `direction: "rtl"` e um locale apropriado para idiomas da direita para a esquerda.

## Arquivos gerados

`locales.js` é gerado a partir dos JSONs pelo script; não edite esse arquivo manualmente. A versão incluída na pasta permite abrir o site localmente sem internet. Ao adicionar ou editar um JSON localmente, execute o gerador para atualizar essa versão.

`language.js` só cuida de chaves, escolha, formatação e menu. Os scripts da interface não guardam frases. `assets.js`, `guide-data.js` e `guide-references.js` guardam dados técnicos e marcadores `i18n:chave`; `localize-data.js` resolve esses marcadores antes de exibir o conteúdo.

O símbolo e o nome próprio Dimensional Flux Miner na marca SVG são a identidade do projeto e não mudam com o idioma.

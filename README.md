# Dimensional Flux Miner — Showcase

Uma vitrine interativa para conhecer o **Dimensional Flux Miner** antes de entrar no Minecraft. O projeto apresenta as máquinas, os blocos e a progressão do mod em um catálogo visual, acompanhado do guia completo do jogo.

[CurseForge](https://www.curseforge.com/minecraft/mc-mods/dimensional-flux-miner) · [Modrinth](https://modrinth.com/mod/dimensional-flux-miner)

## A experiência

- **Catálogo 3D:** explore os blocos, gire os modelos e alterne os estados das máquinas para observar seu funcionamento.
- **Tanques dimensionais:** conheça o tanque simples e o duplo, seus canais entre dimensões e a automação de líquidos.
- **Guia completo:** consulte materiais, receitas, progressão, dimensões e configurações em uma página dedicada.
- **Montagem visual:** veja a posição de cada bloco nas estruturas das máquinas em 3D.
- **Detalhes dos itens:** ícones, texturas animadas e dicas ajudam a reconhecer os materiais durante a leitura.
- **Idiomas da comunidade:** inglês como padrão, português disponível e suporte a novas traduções por arquivos JSON.
- **Dados atualizados:** a versão do Minecraft e o total de downloads acompanham os dados públicos das plataformas.

## Traduções

Os textos da interface, do catálogo e do guia ficam concentrados em [`i18n/`](i18n/). Cada idioma possui seu próprio arquivo; [`en.json`](i18n/en.json) é a base das traduções e [`pt.json`](i18n/pt.json) contém o português.

Para contribuir com outro idioma:

1. Copie `i18n/en.json` para um arquivo com o código do idioma, como `i18n/es.json`.
2. Ajuste os metadados `code`, `name`, `locale` e `direction`.
3. Traduza os valores, preservando as chaves, os marcadores como `{count}` e os códigos de formatação do Minecraft.
4. Envie o arquivo em um pull request.

Após o merge, o idioma é reconhecido automaticamente e aparece no seletor com seu nome nativo. Não é necessário alterar o menu ou adicionar o idioma ao JavaScript. Textos ainda não traduzidos usam o inglês como alternativa.

As orientações sobre plurais, nomes dos itens e validação estão no [guia de tradução](i18n/README.md).

## Integrações com as plataformas

As consultas usam informações públicas, sem solicitar credenciais ao visitante.

| Origem | Informações utilizadas | Projeto |
| --- | --- | --- |
| CurseForge, pela API comunitária CFWidget | Versão do Minecraft e total de downloads | [`1733017`](https://api.cfwidget.com/1733017) |
| Modrinth | Total de downloads | [`vTLvFHBt`](https://api.modrinth.com/v2/project/vTLvFHBt) |

A versão exibida considera o arquivo recomendado pelo CFWidget, priorizando uma release e recorrendo a beta ou alpha quando necessário. Quando o arquivo suporta várias versões do Minecraft, a maior aparece em destaque. Essa integração atualiza a versão do Minecraft; os requisitos NeoForge e Java continuam definidos pelo projeto.

O contador reúne os downloads disponíveis nas duas plataformas. Se uma delas estiver indisponível, retornar dados inválidos ou ainda não tiver um projeto público, a outra continua funcionando. Uma contagem igual a zero é válida.

Cada plataforma mantém um cache independente de 15 minutos no navegador. Durante uma falha, o último dado válido é preservado; sem cache, os dados locais de `project-info.js` servem como alternativa para o CurseForge. O serviço CFWidget também pode ter seu próprio atraso de atualização.

## Estrutura e reutilização

A vitrine usa HTML, CSS e JavaScript, com renderização 3D baseada em Three.js. Os modelos e suas texturas estão incorporados em `assets.js`: a apresentação não depende dos arquivos editáveis ou das pastas de backup do mod.

| Área | Arquivos principais |
| --- | --- |
| Apresentação e catálogo | `index.html`, `app.js`, `styles.css` |
| Guia e montagem das máquinas | `guia.html`, `guide.js`, `guide-data.js`, `assembly-guide.js` |
| Modelos, texturas e visualizador | `assets.js`, `viewer.js` |
| Traduções | `i18n/`, `language.js`, `localize-data.js` |
| Integrações e dados locais | `cfwidget.js`, `project-info-ui.js`, `project-config.js`, `project-info.js` |
| Identidade visual e imagens | `branding/`, `icons/`, `images/` |

Para adaptar a vitrine a outro projeto, substitua a identidade visual, os textos dos idiomas, o catálogo e os dados do guia. Atualize também os links de download e os identificadores das plataformas: o Modrinth é configurado em `project-config.js`; o identificador do CurseForge aparece nas consultas e validações de `cfwidget.js` e `project-info-ui.js`. Os dados locais e os testes devem acompanhar essa alteração.

Contribuições com traduções, melhorias de acessibilidade, correções no guia e ajustes na experiência 3D são bem-vindas por issues e pull requests.

## Licença

O código do projeto está disponível sob a [licença MIT](LICENSE). A licença do Three.js está incluída em [`vendor/THREE-LICENSE.txt`](vendor/THREE-LICENSE.txt).

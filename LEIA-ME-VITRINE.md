# Dimensional Flux Miner — Vitrine interativa

## Navegação

`index.html` apresenta o mod, o catálogo de blocos, as máquinas e os links de download. `guia.html` reúne os 11 capítulos do guia, com busca, receitas, materiais, tabelas e montagem da mineradora.

## Catálogo 3D

Cada cartão abre um modelo interativo. Arraste para girar e use a roda do mouse ou dois dedos para aproximar. As setas do teclado giram a câmera; `+` e `-` ajustam o zoom. `Esc` fecha a visualização.

As máquinas oferecem os estados desligado, idle e ativo. A mineradora permite selecionar núcleo básico, estabilizado ou nenhum núcleo. A pausa das animações e o giro automático da câmera são independentes. O livro pode ser observado aberto ou fechado, pela frente e por trás.

## Modelos e texturas

`assets.js` contém as geometrias e as imagens PNG incorporadas dos modelos, incluindo as texturas animadas. `images/` contém as miniaturas do catálogo e do destaque. `icons/` contém os ícones usados no guia. Esses recursos acompanham a vitrine e dispensam as pastas do acervo de backup.

A mineradora usa o atlas `dimensional_flux_miner.png`, com 256 × 304 pixels. As coordenadas UV associam as faces às regiões correspondentes do atlas. Os núcleos, estados de energia, animações e superfícies transparentes têm seus próprios materiais.

## Guia

As receitas essenciais começam abertas e podem ser recolhidas individualmente. A montagem apresenta os 27 blocos da mineradora em 3D, com seleção de camadas e destaque por peça.

Em Dimensões, cada família ocupa um espaço fixo que alterna entre variantes a cada 1,4 segundo. O botão de pausa, o foco do teclado e o cursor permitem interromper essa alternância. As dicas de itens aparecem nas primeiras menções úteis de cada capítulo. Os fluidos usam ícones quadrados animados. As entradas e saídas usam suas respectivas cores.

As tabelas mostram os valores padrão do mod. Configurações do servidor, datapacks e mods instalados podem alterar os valores em jogo. As instruções sobre controles das máquinas e atalhos se aplicam ao Minecraft.

## Idiomas

Os textos estão em `i18n/*.json`. O inglês é o idioma padrão; a escolha do visitante é preservada no navegador e nos links entre as páginas. O menu usa os metadados de cada arquivo. Consulte `i18n/README.md` para traduzir ou adicionar um idioma.

`i18n/locales.js` é gerado pelo processo de publicação. Para atualizar essa cópia local, execute `node scripts/build-i18n.mjs`. As chaves dos dados são resolvidas por `localize-data.js` antes da exibição.

## Dados do projeto e downloads

A versão Minecraft é atualizada pelo CFWidget para o projeto CurseForge 1733017. O contador soma os downloads disponíveis do CurseForge e do Modrinth, projeto vTLvFHBt. Se uma plataforma não fornecer dados, a outra continua funcionando. O cache do navegador e o retrato local preservam os dados disponíveis durante falhas de conexão.

O contador leva aos botões de download no fim da página. Cada botão abre a página do mod na respectiva plataforma.

## Marca

`branding/` contém o símbolo e a logo completa em SVG. O símbolo é dividido entre ciano esverdeado e violeta. O favicon é transparente; a logo exibida no site recebe uma caixa escura arredondada. O banner exportado permanece sem fundo.

## Publicação

Envie todo o conteúdo desta pasta ao repositório do site e selecione GitHub Actions como origem do GitHub Pages. O workflow valida as traduções, descobre os idiomas e publica a vitrine a cada atualização da branch padrão. Consulte `README.md` para o procedimento completo.

## Bibliotecas e recursos

A biblioteca Three.js acompanha a pasta `vendor/`, com sua licença em `vendor/THREE-LICENSE.txt`. Os recursos de Minecraft/Mojang e as marcas das plataformas mantêm seus respectivos créditos. Os recursos do mod seguem a licença do projeto.

# CLAUDE.md — contexto para assistentes de IA

Leia isto antes de mexer no projeto. Resume decisões tomadas com o dono do site ao longo do desenvolvimento.

## Regra nº 1: idioma

**Responda sempre em português do Brasil.** O dono do projeto (Lorenzo) escreve em português e já reclamou quando
as respostas escaparam para o inglês. Comentários de código, mensagens de commit e documentação também são em português.

## O projeto

Portfólio pessoal de **Lorenzo Jorge**, desenvolvedor full-stack com foco em back-end (Curitiba, PR).

- Site publicado: https://llorenzojorge.github.io (GitHub Pages, servido da raiz do branch `main`)
- Repositório público: `llorenzojorge/llorenzojorge.github.io`. Tudo que entra aqui fica visível: nada de dados
  pessoais além do que já está no site (e-mail, LinkedIn, GitHub, Instagram). **Telefone nunca.**
- Publicar = merge/push em `main`. O Pages atualiza em cerca de 1 minuto.
- **Mudanças grandes vão num branch** e só vão para `main` depois que o Lorenzo aprovar.

## Stack e estrutura

HTML, CSS e JavaScript nativos, **sem build e sem dependências**. JavaScript em ES Modules (precisa ser servido por
HTTP; abrir o arquivo direto não funciona).

```
index.html                     marcação de todas as seções + desenhos SVG do Chevettinho e do mapa
assets/css/
  tokens.css                   paleta, fontes, curvas (único lugar com cores fixas da marca)
  base.css                     reset, tipografia, fundo estático (textura + curvas de nível)
  layout.css                   área de conteúdo, seções, animações de entrada, rodapé
  components/                  minimap, hero, about, stack, projects, contact, chevettinho
  motion.css                   tela de abertura e a transição do mapa ("atlas")
  responsive.css               tablet (≤1100px) e celular (≤720px)
assets/js/
  main.js                      ponto de entrada; orquestra boot → hero → Chevettinho
  core/config.js               paradas (STOPS), eventos, chaves de storage, e-mail
  core/utils.js · scroll.js    utilitários e posições de rolagem
  i18n/pt.js · en.js · index.js  textos e troca de idioma
  modules/roadmap.js           estrada lateral + transição do mapa (o coração da navegação)
  modules/chevettinho.js       o guia: tour roteirizado e perguntas prontas
  modules/reveal.js            animações ao rolar
  modules/projects.js          simulação requisição → resposta nos cards
  modules/hero.js · boot.js · contact.js
assets/img/                    favicon.svg e topography.svg (gerado por script, curvas de nível)
scripts/smoke-test.mjs         teste no Chrome headless (ver "Como testar")
```

Os módulos conversam por eventos no `document`: `app:langchange`, `road:depart`, `road:arrive`. O roadmap não conhece
o Chevettinho; o guia só escuta a estrada e pede viagens a ela (`roadmap.travelTo("#projetos")`).

## Identidade visual (decidida com o Lorenzo; não trocar sem pedir)

- **Paleta "Concreto escuro"** (escolhida entre 5 opções): fundo `#2b2e34`, barra lateral `#212328`,
  asfalto `#121317`, texto `#eceef1`, cobalto claro `#7088ff` como cor de marca, ferrugem `#e07a5f` só em erros.
  **Uma paleta só, sem tema claro/escuro.** Ele achou parecida com o Discord e gostou.
- Fontes: **Fraunces** (títulos, itálico só em palavras de destaque), **Inter** (texto), **JetBrains Mono** (rótulos técnicos).
- Terminal e trechos de código são "ilhas" um degrau mais escuras (`.term`, `.project__visual` em `tokens.css`).
- Visual com **personalidade, não genérico**. Ele rejeitou: navbar padrão no topo, partículas, grade de fundo,
  brilhos que seguem o mouse, roxo genérico, frases de rodapé amadoras (ex.: "feito sem frameworks").

## Navegação: a estrada (roadmap)

- No lugar de navbar há um **minimapa lateral em forma de estrada em serpentina** (no celular ela deita na base
  da tela). Cada seção é uma parada; o **Chevettinho** (visto de cima, símbolo SVG `#car-top`) anda pela curva
  conforme a rolagem e vira nas curvas. O trecho percorrido fica em cobalto; um odômetro conta "km".
- A curva é **gerada em JS** (`layout()` em `roadmap.js`) a partir do tamanho da barra; as paradas recebem `--x`/`--y`.
- **Transição entre paradas (escolhida: "mapa visto de cima")**: ao clicar numa parada ou em qualquer link interno,
  a página se afasta, aparece o mapa grande do site (`#atlas`), a câmera sobe, o carro dirige até o destino e a câmera
  mergulha na cidade de destino enquanto a seção nova aparece. Coordenadas das 5 cidades estão no `index.html`.

### Para adicionar ou remover uma seção (parada)

Mexer em **todos** estes pontos, senão a estrada e o mapa saem de sincronia:
1. a `<section id="...">` no `index.html`;
2. `STOPS` e `STOP_LABEL_KEYS` em `core/config.js`;
3. o `<li>` correspondente em `.map__stops` (`index.html`);
4. uma `.atlas__city` nova e o `d` dos três paths do atlas (`atlas-road`, `atlas-done`, `atlas__lane`);
5. as chaves `nav.*` em `pt.js` e `en.js`, e as falas do tour (`buddy.steps`, uma por parada).

## Movimento e acessibilidade

- O movimento só acontece **quando o visitante pede** (clique) ou na entrada do conteúdo. Nada anima em loop
  enquanto a pessoa lê e **nada segue o cursor** (ele citou leitores com dislexia).
- O Windows do Lorenzo tem "Efeitos de animação" desligado, então os navegadores dele reportam
  `prefers-reduced-motion: reduce`. Quando o site cortava animações por isso, ele via o site "seco" e reclamou.
  **As transições ficam ligadas para todos.** Não reintroduzir corte por reduced-motion sem perguntar a ele.
- Sequências críticas (abertura, viagem) avançam pelo relógio (`setTimeout`), não só por `requestAnimationFrame`,
  para não travarem se o navegador pausar a renderização.
- A viagem leva o foco do teclado ao título da seção; a parada ativa tem `aria-current`.

## Textos e conteúdo

- Todo texto traduzível vive em `assets/js/i18n/pt.js` e `en.js`, **com as mesmas chaves nos dois**. O HTML só usa
  `data-i18n`, `data-i18n-html` ou `data-i18n-aria`. Mudou o português, mude o inglês junto.
- O mascote se chama **Chevettinho** (com dois T).
- Os fatos vêm do currículo e dos READMEs reais dos repositórios do GitHub dele. **Não invente números, cargos
  ou rotas de API.** Projetos em destaque: estoque-lotes-api, rocketlog, radar-vagas, TaskbarLed; outros: mentor-dev,
  api-restaurant.
- Ele prioriza **software sólido, boa arquitetura, escalabilidade e boas práticas**; o texto deve vendê-lo assim,
  de forma profissional e sem exagero.

## Como testar

1. Servir localmente: `npx http-server . -p 5173 -c-1`
2. Sintaxe: `node --check` em cada arquivo de `assets/js/`.
3. Teste no navegador real: `node scripts/smoke-test.mjs http://localhost:5173/ desktop` (também `tablet` e `mobile`).
   Ele confere abertura, tour, transição do mapa, rolagem, revelações e o guia, e salva capturas em `.smoke/`.

Armadilha: o painel de navegador embutido no app Claude Desktop pausa/limita `requestAnimationFrame` e
`IntersectionObserver` quando está oculto ou fora de foco. Não confie em medidas de FPS ou de animação feitas nele;
use o smoke test (Chrome headless via DevTools Protocol).

## Commits

- Conventional Commits em português (`feat:`, `style:`, `fix:`, `docs:`, `chore:`), corpo explicando o porquê.
- Separar por camada (estilo, funcionalidade, documentação) quando fizer sentido.
- Terminar com: `Co-Authored-By: Claude <noreply@anthropic.com>` (ajuste o nome do modelo em uso).
- Autor: e-mail noreply do GitHub dele (já configurado no Git da máquina). Não trocar.

## Como ele gosta de trabalhar

- Prefere **ver opções visuais antes** de implementar mudanças de identidade (paleta, navegação, transições) e escolher
  por códigos (ex.: "P4 + N2 + T2").
- Testa no próprio navegador e dá feedback direto; quer impacto visual ("uau") com acabamento profissional.
- Antes de publicar, quer que tudo seja verificado.

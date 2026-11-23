<div align="center">

# Lorenzo Jorge · Portfólio

**Software sólido hoje, pronto para escalar amanhã.**

Portfólio pessoal de desenvolvedor full-stack com foco em back-end, guiado pelo **Chevettinho**,
um mascote que dirige pelo site e apresenta cada seção.

[**Ver o site →**](https://llorenzojorge.github.io)

![HTML5](https://img.shields.io/badge/HTML5-16131f?style=flat-square&logo=html5&logoColor=e9e4ff)
![CSS3](https://img.shields.io/badge/CSS3-16131f?style=flat-square&logo=css&logoColor=e9e4ff)
![JavaScript](https://img.shields.io/badge/JavaScript_(ES_Modules)-16131f?style=flat-square&logo=javascript&logoColor=e9e4ff)
![Three.js](https://img.shields.io/badge/Three.js-16131f?style=flat-square&logo=threedotjs&logoColor=e9e4ff)
![Sem build](https://img.shields.io/badge/build-nenhum-7088ff?style=flat-square)

</div>

## Destaques

- **A navegação é uma estrada.** No lugar de uma navbar, um minimapa lateral em serpentina com uma parada por seção.
  O **Chevettinho**, visto de cima, anda pela curva acompanhando a leitura, e o odômetro marca o caminho percorrido.
- **Transição de viagem em 3D.** Ao clicar numa parada, a página dá lugar a um diorama noturno do site
  (three.js): a câmera sobe, os postes acendem em sequência, o carro dirige pelos morros até o destino,
  a cidade de chegada se ilumina e a câmera mergulha na seção nova. Sem WebGL, a viagem acontece num mapa em SVG.
- **Um guia, sem IA.** O Chevettinho faz um tour roteirizado e depois responde a perguntas prontas.
  Tudo no cliente, sem backend e sem custo.
- **Calmo para ler.** Nada segue o cursor e nada fica animando em loop: o fundo é uma textura de concreto com
  curvas de nível estáticas, e o movimento só acontece quando o visitante pede.
- **Projetos que se explicam.** Cada card simula uma requisição real da API e a resposta que ela devolve.
- **Bilíngue.** Português e inglês, com a escolha salva para a próxima visita.
- **Uma identidade só.** Paleta "concreto escuro" (chumbo, asfalto e cobalto), sem alternância de tema; terminal e código ficam em ilhas de grafite.
- **Responsivo.** Desktop, tablet e celular.

## Por que sem framework

O site é estático e tem uma página só. HTML, CSS e JavaScript nativos resolvem isso sem build,
sem dependências para manter e com carregamento rápido. A organização vem da estrutura de pastas e dos
módulos, não de uma ferramenta.

A única biblioteca é o **three.js**, usado só no diorama da viagem. Ele fica copiado no repositório
(`assets/vendor/three.min.js`), recortado para as classes usadas, e é carregado em segundo plano depois
da abertura, então não atrasa a primeira tela.

## Estrutura

```
.
├── index.html                  marcação semântica de todas as seções
└── assets/
    ├── css/
    │   ├── tokens.css          paleta "concreto escuro", tipografia e curvas
    │   ├── base.css            reset, tipografia e fundo estático
    │   ├── layout.css          área de conteúdo, seções e rodapé
    │   ├── components/         um arquivo por parte (minimapa, hero, sobre, stack, projetos, contato, Chevettinho)
    │   ├── motion.css          abertura e transição do mapa visto de cima
    │   └── responsive.css      ajustes para tablet e celular
    ├── js/
    │   ├── main.js             ponto de entrada: inicializa os módulos e orquestra a abertura
    │   ├── core/               configuração, paradas, utilitários e posições de rolagem
    │   ├── i18n/               dicionários PT/EN e a troca de idioma
    │   └── modules/            um módulo por funcionalidade (estrada, diorama 3D, Chevettinho, projetos…)
    ├── vendor/             three.js recortado e minificado (com a licença MIT)
    └── img/                favicon e curvas de nível do fundo (SVG gerado)
scripts/smoke-test.mjs          teste no Chrome headless (abertura, estrada, viagem, guia)
scripts/vendor/three-entry.mjs  lista das classes do three.js usadas e como gerar o recorte
CLAUDE.md                       contexto e decisões do projeto para assistentes de IA
```

### Decisões de arquitetura

- **ES Modules nativos.** Cada módulo tem uma responsabilidade e exporta só o que os outros precisam.
- **Módulos desacoplados por eventos.** A troca de idioma e cada viagem disparam eventos no `document`
  (`app:langchange`, `road:depart`, `road:arrive`), e cada módulo reage por conta própria. O roadmap não
  conhece o Chevettinho: o guia só escuta a estrada e pede viagens a ela.
- **Textos fora do código.** Toda a cópia fica em `assets/js/i18n/pt.js` e `en.js`. O HTML só referencia chaves
  (`data-i18n`, `data-i18n-html`, `data-i18n-aria`).
- **Design tokens.** Cores, fontes e curvas vivem em variáveis CSS. As ilhas escuras (terminal e código) só redefinem os tokens.
- **Acessibilidade.** Navegação por teclado (a viagem leva o foco ao título da seção), `aria-current` na parada ativa,
  textos alternativos traduzidos e nada de efeitos que seguem o cursor.

## Rodando localmente

Como o JavaScript usa ES Modules, o site precisa ser servido por HTTP (abrir o arquivo direto não funciona):

```bash
npx http-server . -p 5173
```

Depois, abra `http://localhost:5173`.

Para conferir tudo num Chrome de verdade (sem dependências, só Node 22+):

```bash
node scripts/smoke-test.mjs http://localhost:5173/ desktop   # ou tablet, mobile
```

## Editando o conteúdo

| Quero mudar…                 | Onde                                                      |
| ---------------------------- | --------------------------------------------------------- |
| Textos (PT e EN)             | `assets/js/i18n/pt.js` e `assets/js/i18n/en.js`           |
| Falas do Chevettinho         | chaves `buddy.steps` e `buddy.q` nos mesmos arquivos      |
| Cores e fontes               | `assets/css/tokens.css`                                   |
| Projetos                     | seção `#projetos` do `index.html` + chaves `p1`…`p4`      |
| E-mail de contato            | `assets/js/core/config.js` e a seção `#contato` do HTML   |

> Ao mudar um texto em português, atualize o inglês junto: toda chave existe nos dois idiomas.

## Licença

[MIT](LICENSE) © Lorenzo Jorge

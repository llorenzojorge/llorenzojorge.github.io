<div align="center">

# Lorenzo Jorge · Portfólio

**Software sólido hoje, pronto para escalar amanhã.**

Portfólio pessoal de desenvolvedor full-stack com foco em back-end, guiado pelo **Chevettinho**,
um mascote que dirige pelo site e apresenta cada seção.

[**Ver o site →**](https://llorenzojorge.github.io)

![HTML5](https://img.shields.io/badge/HTML5-16131f?style=flat-square&logo=html5&logoColor=e9e4ff)
![CSS3](https://img.shields.io/badge/CSS3-16131f?style=flat-square&logo=css&logoColor=e9e4ff)
![JavaScript](https://img.shields.io/badge/JavaScript_(ES_Modules)-16131f?style=flat-square&logo=javascript&logoColor=e9e4ff)
![Sem dependências](https://img.shields.io/badge/dependências-0-b18cff?style=flat-square)

</div>

## Destaques

- **Chevettinho, o guia.** Um tour roteirizado: a cada parada o carrinho atravessa a tela enquanto a página rola,
  mostra a placa da seção de destino, dá meia-volta e estaciona. Depois do tour, ele responde a perguntas prontas.
  Tudo no cliente, sem IA, sem backend e sem custo.
- **Fundo vivo.** Uma rede de nós desenhada em `<canvas>`, com pacotes de dados viajando pelas conexões
  e uma grade que acende em volta do cursor.
- **Projetos que se explicam.** Cada card simula uma requisição real da API e a resposta que ela devolve.
- **Bilíngue.** Português e inglês, com a escolha salva para a próxima visita.
- **Tema escuro e claro.** O escuro é o padrão; no claro, terminal e trechos de código continuam escuros.
- **Responsivo.** Desktop, tablet e celular.

## Por que sem framework

O site é estático e tem uma página só. HTML, CSS e JavaScript nativos resolvem isso sem build,
sem dependências para manter e com carregamento rápido. A organização vem da estrutura de pastas e dos
módulos, não de uma ferramenta.

## Estrutura

```
.
├── index.html                  marcação semântica de todas as seções
└── assets/
    ├── css/
    │   ├── tokens.css          paleta, temas claro/escuro e curvas de animação
    │   ├── base.css            reset, tipografia e utilitários
    │   ├── layout.css          navegação, seções e rodapé
    │   ├── components/         um arquivo por seção (hero, about, stack, projects, contact, chevettinho)
    │   ├── motion.css          fundo animado, abertura e efeitos da viagem
    │   └── responsive.css      ajustes para tablet e celular
    ├── js/
    │   ├── main.js             ponto de entrada: inicializa os módulos e orquestra a abertura
    │   ├── core/               configuração, utilitários e rolagem controlada
    │   ├── i18n/               dicionários PT/EN e a troca de idioma
    │   └── modules/            um módulo por funcionalidade (tema, navegação, fundo, Chevettinho…)
    └── img/
```

### Decisões de arquitetura

- **ES Modules nativos.** Cada módulo tem uma responsabilidade e exporta só o que os outros precisam.
- **Módulos desacoplados por eventos.** Trocar idioma ou tema dispara um evento no `document`
  (`app:langchange`, `app:themechange`), e cada módulo reage por conta própria. Assim, o i18n não precisa
  conhecer o Chevettinho, nem o tema precisa conhecer o canvas.
- **Textos fora do código.** Toda a cópia fica em `assets/js/i18n/pt.js` e `en.js`. O HTML só referencia chaves
  (`data-i18n`, `data-i18n-html`, `data-i18n-aria`).
- **Design tokens.** Cores e curvas vivem em variáveis CSS. Os temas trocam só os tokens, não os componentes.
- **Performance.** Brilhos feitos com gradientes em vez de `filter: blur`, sem `backdrop-filter` sobre o fundo
  animado e o canvas pausado quando a aba fica em segundo plano.

## Rodando localmente

Como o JavaScript usa ES Modules, o site precisa ser servido por HTTP (abrir o arquivo direto não funciona):

```bash
npx http-server . -p 5173
```

Depois, abra `http://localhost:5173`.

## Editando o conteúdo

| Quero mudar…                 | Onde                                                      |
| ---------------------------- | --------------------------------------------------------- |
| Textos (PT e EN)             | `assets/js/i18n/pt.js` e `assets/js/i18n/en.js`           |
| Falas do Chevettinho         | chaves `buddy.steps` e `buddy.q` nos mesmos arquivos      |
| Cores e temas                | `assets/css/tokens.css`                                   |
| Projetos                     | seção `#projetos` do `index.html` + chaves `p1`…`p4`      |
| E-mail de contato            | `assets/js/core/config.js` e a seção `#contato` do HTML   |

> Ao mudar um texto em português, atualize o inglês junto: toda chave existe nos dois idiomas.

## Licença

[MIT](LICENSE) © Lorenzo Jorge

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

- **A navegação é uma estrada.** No lugar de uma navbar, um minimapa lateral com uma parada por seção.
  O **Chevettinho** anda pela estrada acompanhando a leitura, e o odômetro marca o caminho percorrido.
- **Transição de viagem.** Ao clicar numa parada, a página desliza para a esquerda como se a câmera seguisse
  o carro, uma placa com o destino cruza a tela e a seção nova entra pela direita.
- **Um guia, sem IA.** O Chevettinho faz um tour roteirizado e depois responde a perguntas prontas.
  Tudo no cliente, sem backend e sem custo.
- **Calmo para ler.** Nada segue o cursor e nada fica animando em loop: o fundo é uma textura de concreto com
  curvas de nível estáticas, e o movimento só acontece quando o visitante pede.
- **Projetos que se explicam.** Cada card simula uma requisição real da API e a resposta que ela devolve.
- **Bilíngue.** Português e inglês, com a escolha salva para a próxima visita.
- **Uma identidade só.** Paleta "concreto e cobalto", sem alternância de tema; terminal e código ficam em ilhas de grafite.
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
    │   ├── tokens.css          paleta "concreto e cobalto", tipografia e curvas
    │   ├── base.css            reset, tipografia e fundo estático
    │   ├── layout.css          área de conteúdo, seções e rodapé
    │   ├── components/         um arquivo por parte (minimapa, hero, sobre, stack, projetos, contato, Chevettinho)
    │   ├── motion.css          abertura e transição entre paradas
    │   └── responsive.css      ajustes para tablet e celular
    ├── js/
    │   ├── main.js             ponto de entrada: inicializa os módulos e orquestra a abertura
    │   ├── core/               configuração, paradas, utilitários e posições de rolagem
    │   ├── i18n/               dicionários PT/EN e a troca de idioma
    │   └── modules/            um módulo por funcionalidade (estrada, Chevettinho, projetos…)
    └── img/                favicon e curvas de nível do fundo (SVG gerado)
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

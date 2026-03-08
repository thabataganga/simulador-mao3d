# Simulador Mao 3D

Simulador web para visualizacao e ajuste da pose de uma mao humana em 3D, com foco em prescricao clinica simplificada de orteses e analise de posicionamento articular.

## Visao Geral

O projeto permite ajustar parametros articulares em tempo real e observar imediatamente o efeito da prescricao em um modelo 3D.

Objetivos principais:
- Facilitar exploracao visual da pose da mao para apoio clinico.
- Unificar ajustes globais (D2-D5 e grip) com ajustes finos (polegar e punho).
- Manter um fluxo tecnico claro entre estado da UI, regras de dominio e renderizacao 3D.

## Funcionalidades Atuais

- Controle antropometrico por sexo, percentil e idade.
- Presets de pose: `Funcional`, `Neutro` e `Zero`.
- Controle global D2-D5 (MCP, PIP, DIP) com aplicacao simultanea nos quatro dedos.
- Painel dedicado do polegar (CMC abd/flex/oposicao, MCP, IP).
- Painel dedicado de punho (flexao/extensao e desvio radial/ulnar).
- Controle de fechamento global (`grip`) com interpolacao funcional.
- Destaque visual da articulacao ativa na cena 3D (debug/highlight).
- Viewcube para referencia de orientacao da camera.

## CMC do Polegar (Didatico-Goniometrico)

O CMC do polegar (flexao/extensao e abducao/aducao) esta configurado para uso clinico didatico.

- A UI usa `direcao + magnitude` no painel (nao exibe o comando tecnico assinado).
- Convencao clinica interna:
- `flexao` e `abducao` sao positivos.
- `extensao` e `aducao` sao negativos.
- Em `0 deg`, a direcao permanece selecionavel e persistente via radio.

### Entrada Clinica x Saida Exibida

- O valor digitado/slider no painel representa o alvo clinico.
- O sistema resolve internamente o comando do rig para aproximar a medida clinica.
- A leitura clinica exibida no painel em `Medida goniometrica` e no label 3D `CMC: <direcao> <graus>` vem da medicao goniometrica, nao do comando bruto.
- Tolerancia visual/numerica esperada na leitura: cerca de `+-1 deg`.

### Visualizacao 3D do CMC

Ao focar `TH_CMC_FLEX` ou `TH_CMC_ABD`:

- Plano anatomico CMC.
- Duas hastes do goniometro (fixa e movel).
- Arco angular entre as hastes.
- Label clinico no formato `CMC: <direcao> <graus>`.

O overlay extra do goniometro nesta fase e exclusivo de CMC.

## Stack e Arquitetura

Stack principal:
- React 19
- Vite 7
- Three.js
- Jest + Babel
- ESLint (flat config)
- Tailwind CSS v4

Arquitetura logica:
1. `poseState`: estado clinico atual usado pela UI.
2. `poseActions`: acoes de dominio para atualizar pose, presets e controles globais.
3. `sceneInput`: payload final consumido pelo modulo 3D.

Fluxo principal:

```text
UI (sliders, formularios e presets)
  -> poseActions
  -> poseState
  -> sceneInput
  -> rig/cena 3D (Three.js)
```

## Execucao Local

Pre-requisitos:
- Node.js 18+ (recomendado: versao LTS atual)
- npm

Instalacao:

```bash
npm install
```

Ambiente de desenvolvimento:

```bash
npm run dev
```

Build de producao:

```bash
npm run build
```

Preview local da build:

```bash
npm run preview
```

Analise de bundle:

```bash
npm run analyze:bundle
```

Observacao para Windows/PowerShell:
- Se houver bloqueio por policy ao executar `npm` (erro relacionado a `npm.ps1`), use `npm.cmd` no lugar, por exemplo: `npm.cmd run dev`.

## Estrutura Principal

```text
src/
  components/   # componentes de UI e integracao da cena
  constants/    # limites articulares, proporcoes e keyframes
  domain/       # regras puras de pose e transformacao de estado
  hooks/        # orquestracao React + dominio + Three.js
  three/        # construcao do rig e helpers de render/debug
  utils/        # matematica, antropometria e utilitarios gerais
scripts/
  print-bundle-stats.mjs  # relatorio textual do bundle gerado
```

## Troubleshooting CMC (Line2)

Historico:
- Houve crash no overlay CMC com `Line2` quando `computeLineDistances()` era chamado antes de existir geometria valida.

Status:
- Corrigido no helper de goniometro CMC (ciclo de vida de `Line2` estabilizado).

Checklist rapido de validacao manual:
1. Rodar `npm run dev` (ou `npm.cmd run dev` no Windows).
2. Abrir painel do polegar e focar `CMC Flexao/Extensao`.
3. Confirmar plano + duas hastes + arco + label clinico sem erro no console.
4. Repetir para `CMC Abd/Aducao`.
5. Redimensionar a janela e confirmar espessura consistente do traco.

## Qualidade e Validacao

Checklist recomendado antes de abrir PR:

```bash
npm run lint
npm run test -- --runInBand
npm run build
npm run analyze:bundle
```

Criterios esperados:
- Lint sem erros.
- Testes unitarios passando.
- Build de producao concluida.
- Relatorio de bundle gerado e legivel.

## Notas de Interface Interna

- `thumbGoniometry` e a fonte clinica usada para exibir direcao/medida no painel.
- `useHandRig` orquestra medicao CMC e overlay goniometrico na cena.

## Licenca

MIT.

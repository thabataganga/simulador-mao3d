# Simulador Mão 3D

Simulador web para visualização e ajuste da pose de uma mão humana em 3D, com foco em prescrição clínica simplificada de órteses e análise de posicionamento articular.

## Visão Geral

O projeto permite ajustar parâmetros articulares em tempo real e observar imediatamente o efeito da prescrição em um modelo 3D.

Objetivos principais:
- Facilitar exploração visual da pose da mão para apoio clínico.
- Unificar ajustes globais (D2-D5 e grip) com ajustes finos (polegar e punho).
- Manter um fluxo técnico claro entre estado da UI, regras de domínio e renderização 3D.

## Funcionalidades Atuais

- Controle antropométrico por sexo, percentil e idade.
- Presets de pose: `Funcional`, `Neutro` e `Zero`.
- Controle global D2-D5 (MCP, PIP, DIP) com aplicação simultânea nos quatro dedos.
- Painel dedicado do polegar (CMC abd/flex/oposição, MCP, IP).
- Painel dedicado de punho (flexão/extensão e desvio radial/ulnar).
- Controle de fechamento global (`grip`) com interpolação funcional.
- Destaque visual da articulação ativa na cena 3D (debug/highlight).
- Viewcube para referência de orientação da câmera.

## Stack e Arquitetura

Stack principal:
- React 19
- Vite 7
- Three.js
- Jest + Babel
- ESLint (flat config)
- Tailwind CSS v4

Arquitetura lógica:
1. `poseState`: estado clínico atual usado pela UI.
2. `poseActions`: ações de domínio para atualizar pose, presets e controles globais.
3. `sceneInput`: payload final consumido pelo módulo 3D.

Fluxo principal:

```text
UI (sliders, formulários e presets)
  -> poseActions
  -> poseState
  -> sceneInput
  -> rig/cena 3D (Three.js)
```

## Execução Local

Pré-requisitos:
- Node.js 18+ (recomendado: versão LTS atual)
- npm

Instalação:

```bash
npm install
```

Ambiente de desenvolvimento:

```bash
npm run dev
```

Build de produção:

```bash
npm run build
```

Preview local da build:

```bash
npm run preview
```

Análise de bundle:

```bash
npm run analyze:bundle
```

Observação para Windows/PowerShell:
- Se houver bloqueio por policy ao executar `npm` (erro relacionado a `npm.ps1`), use `npm.cmd` no lugar, por exemplo: `npm.cmd run dev`.

## Estrutura Principal

```text
src/
  components/   # componentes de UI e integração da cena
  constants/    # limites articulares, proporções e keyframes
  domain/       # regras puras de pose e transformação de estado
  hooks/        # orquestração React + domínio + Three.js
  three/        # construção do rig e helpers de render/debug
  utils/        # matemática, antropometria e utilitários gerais
scripts/
  print-bundle-stats.mjs  # relatório textual do bundle gerado
```

## Qualidade e Validação

Checklist recomendado antes de abrir PR:

```bash
npm run lint
npm run test -- --runInBand
npm run build
npm run analyze:bundle
```

Critérios esperados:
- Lint sem erros.
- Testes unitários passando.
- Build de produção concluída.
- Relatório de bundle gerado e legível.

## Licença

MIT.
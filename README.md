# Simulador Mão 3D

Simulador web para visualização e ajuste da pose de uma mão humana em 3D, com foco em prescrição clínica simplificada de órteses e análise de posicionamento articular.

## Objetivo

Permitir que profissionais ajustem parâmetros articulares de forma visual e interativa, observando em tempo real o efeito da prescrição sobre um modelo 3D da mão.

## Stack

- React
- Vite
- Three.js
- Jest
- ESLint

## Arquitetura (estado, ações e render)

O projeto está organizado em três contratos internos:

1. `poseState`: estado clínico pronto para UI e render.
2. `poseActions`: ações de domínio para atualizar articulações, presets e grip.
3. `sceneInput`: payload único consumido pelo módulo 3D.

Fluxo principal:

```text
UI (sliders e formulários)
  -> poseActions
  -> poseState
  -> sceneInput
  -> módulo 3D (Three.js)
```

## Como executar

```bash
npm install
npm run dev
```

## Qualidade

```bash
npm run lint
npm run test -- --runInBand
npm run build
npm run analyze:bundle
```

## Estrutura principal

```text
src/
  components/   # UI e composição da cena
  domain/       # regras puras de pose e transformação
  hooks/        # integração React + domínio + render 3D
  three/        # construção e helpers do rig
  utils/        # matemática, antropometria e apoio
```

## Próximos passos sugeridos

- Refinar mais o chunk de `three-vendor` para ficar abaixo de 500 kB.
- Adicionar testes para componentes de formulário clínico.
- Evoluir o fluxo de exportação da prescrição.

## Licença

MIT

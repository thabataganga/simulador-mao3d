# Arquitetura Interna (Simulador Mao 3D)

## Fluxo principal

```text
UI -> features/* -> poseActions -> poseReducer -> poseState/selectors -> sceneInput -> useHandRig -> rig Three.js
```

## Camadas

- `src/features/*`: contrato de entrada da UI por feature para a casca da aplicação (`App.jsx`).
- `src/domain/*`: regras puras e transformacao de estado da simulacao (sem dependencias de UI/hook).
- `src/constants/*`: tabelas e configuracoes estaticas de referencia (limites, labels, keyframes).
- `src/hooks/*`: orquestracao React/Three e ligacao entre UI, domain e cena.

## Contratos internos

- `sceneInput` deve conter apenas: `dims`, `fingers`, `thumb`, `wrist`.
- Evento de metrica: `handsim:metric` com `{ eventName, payload, at }`.
- Medicao CMC emitida para UI: `{ CMC_abd, CMC_flex }` com debounce por epsilon.
- Componentes compartilhados entram em `features/*` apenas quando parte do contrato publico da feature.
## Invariantes (Pose x Medicao)

- Presets (`functional`, `neutro`, `zero`) alteram apenas os parametros de pose clinica (`fingers`, `thumb`, `wrist`, `grip`) e nao alteram a estrategia/forma de medicao.
- Overlay de goniometria e oposicao e derivado de `debugKey + pose` em pipeline unico (`syncHandRigOverlays`).
- Rebuild do rig 3D acontece apenas em mudanca estrutural (scene/dims), nunca por troca de `debugKey`.
## Fronteiras UI

- `App.jsx`: orquestra layout, estado de UI (`openPanel`, `debugKey`) e compoe contratos de feature via adapters.
- `features/*/contracts.js`: adaptadores de props (`state/actions/ui`) entre `App` e seções.
- `features/*Section`: fronteira de feature para componentes de apresentacao, sem regra clinica.
- `components/*`: renderizacao e callbacks locais, sem conhecimento de `useHandPose`/`useHandRig`.


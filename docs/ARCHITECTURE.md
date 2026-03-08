# Arquitetura Interna (Simulador Mao 3D)

## Fluxo principal

```text
UI -> features/* -> poseActions -> poseReducer -> poseState/selectors -> sceneInput -> useHandRig -> rig Three.js
```

## Camadas

- `src/features/*`: contrato de entrada da UI por feature para a casca da aplicação (`App.jsx`).
- `src/domain/*`: regras puras e transformacao de estado da simulacao (sem dependencias de UI/hook).
- `src/constants/reference/*`: tabelas e configuracoes estaticas de referencia (limites, labels, keyframes).
- `src/hooks/*`: orquestracao React/Three e ligacao entre UI, domain e cena.

## Contratos internos

- `sceneInput` deve conter apenas: `dims`, `fingers`, `thumb`, `wrist`.
- Evento de metrica: `handsim:metric` com `{ eventName, payload, at }`.
- Medicao CMC emitida para UI: `{ CMC_abd, CMC_flex }` com debounce por epsilon.
- Componentes compartilhados entram em `features/*` apenas quando parte do contrato publico da feature.

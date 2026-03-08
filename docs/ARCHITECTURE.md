# Arquitetura Interna (Simulador Mao 3D)

## Fluxo principal

```text
UI -> poseActions -> poseReducer -> poseState/selectors -> sceneInput -> useHandRig -> rig Three.js
```

## Camadas

- `src/hooks/handPose/reducer.js`: regras de estado e transicoes puras.
- `src/hooks/handPose/selectors.js`: derivacoes de leitura (`thumbClinical`, `thumbGoniometry`, `sceneInput`).
- `src/hooks/handPose/actions.js`: fachada de comandos e telemetria (`handsim:metric`).
- `src/hooks/useHandPose.js`: composicao React das tres camadas acima.
- `src/hooks/handRigMath.js`: matematica e overlays do rig (puro/orquestravel).
- `src/hooks/useHandRig.js`: ciclo de vida do rig, emissao de medidas e efeitos de cena.

## Contratos internos

- `sceneInput` deve conter apenas: `dims`, `fingers`, `thumb`, `wrist`.
- Evento de metrica: `handsim:metric` com `{ eventName, payload, at }`.
- Medicao CMC emitida para UI: `{ CMC_abd, CMC_flex }` com debounce por epsilon.

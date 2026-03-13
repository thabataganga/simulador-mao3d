# Release Checklist - Refatoracao Pose vs Goniometria

## Contratos consolidados

- Presets (`functional`, `neutro`, `zero`) alteram apenas estado de pose clinica (`fingers`, `thumb`, `wrist`, `grip`).
- Pipeline de medicao/overlay continua derivado de `debugKey + pose`.
- Rebuild de rig ocorre apenas por mudanca estrutural (`scene` ou `dims`).
- Adapters de feature seguem contrato agrupado: `state`, `actions`, `ui`.

## Riscos conhecidos

- Smokes automatizados cobrem fluxo critico, mas nao substituem navegacao manual completa no viewport 3D.
- Mudancas futuras em ranges clinicos (CMC/MCP/IP) exigem atualizar testes de contrato e texto tecnico da UI.
- Resize extremo (janela muito pequena) pode manter metrica ativa, mas legibilidade visual depende de CSS/layout.

## Validacao manual (2-3 min)

1. Abrir app e confirmar render inicial da mao no viewport.
2. Alternar presets `Funcional -> Neutro -> Zero` e confirmar:
- mao continua renderizada;
- sliders e leitura de medicao continuam respondendo.
3. Com CMC ativo no debug, alternar highlight entre CMC/MCP e confirmar que o rig nao some.
4. Com overlay CMC/oposicao ativo, redimensionar a janela e confirmar que a medicao/overlay continua visivel.
5. Rodar baseline tecnico local:
- `npm run lint`
- `npm run test -- --runInBand`
- `npm run build`

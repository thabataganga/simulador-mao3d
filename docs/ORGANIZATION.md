# Organização de Código

## Princípios

- Organizar por domínio/feature, não por arquivo monolítico.
- Novo código deve importar de módulos específicos (`constants/*`, `utils/*`).
- Fronteira de importação do app: `App.jsx` consome módulos de `features/*` e evita importar `components/*` diretamente.

## Features

- `features/pose-controls`: contrato de controles globais e formulários usados pela casca da aplicação.
- `features/thumb`: contrato de controles do polegar usados pela casca da aplicação.
- `features/wrist`: contrato de controles do punho usados pela casca da aplicação.
- `features/scene3d`: contrato de entrada da cena 3D (consumo lazy no app).
- Regra: componentes compartilhados só entram em `features/*` quando fizerem parte do contrato público daquela feature.

## Limites de camadas

- `domain/*` não pode importar `features/*`.
- `domain/*` não pode importar `hooks/*`.
- `domain/*` pode importar `constants/*` e `utils/*`.
- `App.jsx` não deve importar `components/*` direto; deve usar `features/*`.

## Testes

- Co-location por padrão (`*.test.js` ao lado do módulo).
- Testes transversais em `src/tests/integration`.
- Fixtures compartilhados em `src/tests/fixtures`.
- Convenção nova:
  - unitário: `*.unit.test.js`
  - integração: `*.int.test.js`

## Dívida técnica registrada

- `features/*/index.js` ainda funcionam como fachada leve sobre `components/*`.
- Próxima etapa: encapsular composição/lógica por feature e reduzir dependência de `components` como camada pública implícita.


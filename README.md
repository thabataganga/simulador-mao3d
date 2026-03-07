# Simulador de Mão 3D

Aplicação web para simulação da posição articular da mão humana em 3D, com foco em prescrição simplificada de movimentos para dedos D2 a D5, polegar e punho.

O projeto foi desenvolvido em **React + Vite + Three.js** e organiza a lógica em três camadas principais:

- **interface clínica** para entrada dos parâmetros
- **estado biomecânico** da mão
- **rig 3D** para visualização e depuração dos movimentos

## Objetivo

Este simulador permite configurar ângulos articulares e visualizar em tempo real a pose da mão em um modelo 3D procedural. A proposta é servir como base para um sistema de prescrição clínica, especialmente para contextos de órteses e reabilitação.

## Funcionalidades atuais

- Ajuste antropométrico da mão por sexo, percentil e idade
- Controle global dos dedos D2 a D5 por MCP, PIP e DIP
- Controle do polegar por CMC, MCP e IP
- Controle do punho por flexão/extensão e desvio
- Presets de pose
- Grip global com modos de fechamento
- Highlight visual da articulação selecionada
- Exibição de plano de movimento e label angular
- Viewcube auxiliar para orientação da cena

## Stack

- **React 19**
- **Vite 7**
- **Three.js 0.179**
- **Tailwind CSS 4**

As dependências e scripts do projeto estão definidos no `package.json`, incluindo `vite` para desenvolvimento e build. citeturn0view0

## Estrutura do projeto

```text
src/
├─ components/
│  ├─ AccordionItem
│  ├─ AnthropometryForm
│  ├─ GlobalD2D5Panel
│  ├─ GripPanel
│  ├─ PresetButtons
│  ├─ ThumbPanel
│  ├─ WristPanel
│  └─ LabeledSlider
├─ hooks/
│  ├─ useHandPose
│  ├─ useHandRig
│  └─ useThreeScene
├─ three/
│  ├─ buildHandRig
│  └─ helpers
├─ utils/
├─ constants/
└─ App.jsx
```

O `App.jsx` funciona como orquestrador da aplicação, integrando os hooks de pose, cena 3D e rig, além de montar os painéis da interface. citeturn0view1

## Como o sistema funciona

### 1. Estado clínico da mão

O hook `useHandPose()` concentra o estado principal da aplicação. Ele mantém:

- ângulos dos dedos D2 a D5
- ângulos do polegar
- ângulos do punho
- valor de grip global
- parâmetros antropométricos
- preset ativo

Também calcula o perfil antropométrico e as dimensões derivadas da mão, além de fornecer ações como:

- atualização global de MCP, PIP e DIP
- atualização dos parâmetros do polegar
- aplicação de grip global
- presets funcional, neutro e zero

Tudo isso fica centralizado no hook de pose. citeturn0view2

### 2. Cena 3D

A cena é criada separadamente e depois recebe o rig da mão. Essa separação ajuda a manter a renderização desacoplada da lógica clínica.

### 3. Rig da mão

O hook `useHandRig()` reconstrói o rig quando as dimensões mudam e aplica as rotações articulares toda vez que a pose é atualizada. Para isso, ele converte graus para radianos, aplica limites articulares e atualiza labels e highlights. citeturn0view3

## Fluxo de dados

```text
Interface → useHandPose → useHandRig → Three.js
```

Ou seja:

1. o usuário ajusta sliders e inputs
2. o estado biomecânico é atualizado
3. o rig recebe os novos ângulos
4. a cena 3D renderiza a nova pose

## Instalação

### Pré-requisitos

- Node.js 18 ou superior
- npm

### Clonar o repositório

```bash
git clone https://github.com/thabataganga/simulador-mao3d.git
cd simulador-mao3d
```

### Instalar dependências

```bash
npm install
```

### Rodar em desenvolvimento

```bash
npm run dev
```

### Gerar build de produção

```bash
npm run build
```

### Visualizar build localmente

```bash
npm run preview
```

Esses scripts estão definidos no `package.json`. citeturn0view0

## Presets disponíveis

O estado da mão inclui três presets principais:

- **Functional**: aplica uma pose funcional com grip intermediário
- **Neutro**: retorna para a postura de repouso calculada a partir das dimensões da mão
- **Zero**: zera os ângulos articulares

Essa lógica é implementada em `useHandPose()`. citeturn0view2

## Controles articulares atuais

### D2 a D5

- MCP
- PIP
- DIP

### Polegar

- CMC abdução
- CMC flexão
- CMC oposição
- MCP flexão
- IP

### Punho

- flexão/extensão
- desvio

No `App.jsx`, a interface apresenta os painéis correspondentes para antropometria, dedos, polegar, punho e grip. citeturn0view1turn0view3

## Pontos fortes do projeto

- Arquitetura clara entre UI, estado e rig 3D
- Modelo procedural com variação antropométrica
- Boa visualização didática das articulações
- Estrutura modular, facilitando evolução do simulador
- Base promissora para futura integração com prescrição clínica

## Limitações atuais

- O modelo do polegar ainda usa uma parametrização técnica que pode não ser a mais intuitiva para uso clínico
- O grip global simplifica parte da sinergia real entre os dedos
- O punho ainda pode ser expandido para representar mais graus de liberdade
- A geometria é procedural e simplificada, não baseada em malha anatômica validada

## Próximos passos sugeridos

- Reestruturar a lógica clínica do polegar para inputs mais intuitivos ao fisioterapeuta
- Refinar a biomecânica do punho
- Adicionar presets clínicos por padrão de deformidade ou função
- Incluir exportação e importação de prescrição
- Integrar banco de dados do paciente e ficha clínica
- Evoluir para compatibilidade com workflow de órtese personalizada

## Arquitetura resumida

- `App.jsx`: integra UI, estado e cena 3D. citeturn0view1
- `useHandPose.js`: guarda o estado biomecânico e antropométrico. citeturn0view2
- `useHandRig.js`: aplica ângulos ao rig e atualiza highlights e labels. citeturn0view3
- `buildHandRig.js`: constrói a hierarquia da mão em Three.js para dedos, polegar e punho. citeturn0view4

## Licença

Atualmente o repositório utiliza a licença **ISC**, conforme definido no `package.json`. citeturn0view0

## Autora

**Thabata Ganga**

Projeto voltado ao desenvolvimento de ferramentas digitais para simulação, prescrição e futura personalização de dispositivos assistivos e de reabilitação.

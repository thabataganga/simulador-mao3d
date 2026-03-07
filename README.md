# Simulador Mão 3D

Simulador web para visualização e ajuste da pose de uma mão humana em 3D, com foco em prescrição clínica simplificada de órteses e análise de posicionamento articular. O projeto combina interface em React, renderização 3D com Three.js e um modelo procedural escalável de mão baseado em parâmetros antropométricos.

## Objetivo

Este projeto foi desenvolvido para permitir que profissionais ajustem parâmetros articulares de forma visual e interativa, observando em tempo real o efeito da prescrição sobre um modelo 3D da mão.

O simulador foi organizado para separar:

* interface de entrada dos parâmetros
* estado biomecânico da mão
* construção e atualização do rig 3D

## Principais funcionalidades

* Visualização 3D interativa da mão com controle de câmera
* Ajuste dos dedos D2 a D5 por parâmetros articulares
* Ajuste do polegar e do punho
* Controle de fechamento global da mão
* Presets de postura
* Escalonamento do modelo com base em sexo, idade e percentil
* Destaque visual da articulação ativa
* Exibição de plano de movimento e label angular para depuração visual

## Tecnologias utilizadas

* React
* Vite
* Three.js
* JavaScript
* CSS

## Estrutura do projeto

```text
src/
├─ components/      # Componentes de interface
├─ constants/       # Limites articulares, keyframes e presets auxiliares
├─ hooks/           # Estado clínico, cena 3D e aplicação do rig
├─ three/           # Construção da mão, helpers visuais e rig
├─ utils/           # Antropometria, interpolação e funções auxiliares
├─ App.jsx          # Orquestra a aplicação
└─ main.jsx         # Ponto de entrada
```

## Arquitetura geral

O fluxo principal do sistema é:

```text
UI de sliders e formulários
        ↓
estado da pose da mão
        ↓
aplicação dos ângulos no rig 3D
        ↓
renderização e inspeção visual
```

### 1. Estado clínico

O hook `useHandPose` centraliza a pose da mão, incluindo:

* dedos D2 a D5
* polegar
* punho
* grip global
* parâmetros antropométricos
* presets ativos

Também calcula dimensões da mão e algumas médias úteis para sincronização de controles.

### 2. Antropometria

As funções utilitárias constroem um perfil antropométrico com base em sexo, idade e percentil. Esse perfil é convertido em dimensões geométricas para palma, dedos, polegar e antebraço.

O modelo é procedural. Em vez de trocar a malha por outra mão, o sistema recalcula proporções e reconstrói a geometria com novas medidas.

### 3. Cena 3D

O hook `useThreeScene` monta:

* cena principal
* câmera em perspectiva
* renderer WebGL
* iluminação
* grid auxiliar
* OrbitControls
* viewcube de orientação

### 4. Rig da mão

A mão é construída como uma hierarquia de grupos 3D, com cadeias articulares independentes para cada dedo. Isso permite aplicar rotações locais e propagar o movimento corretamente ao longo das falanges.

### 5. Aplicação da pose

O hook `useHandRig` pega os valores do estado e converte esses ângulos em rotações do modelo 3D. Ele também controla:

* highlight da articulação ativa
* labels com ângulos
* planos de movimento
* debug visual

## Como executar localmente

### Pré-requisitos

* Node.js 18 ou superior
* npm

### Instalação

```bash
npm install
```

### Ambiente de desenvolvimento

```bash
npm run dev
```

Depois, abra no navegador o endereço exibido no terminal, normalmente algo como:

```text
http://localhost:5173
```

### Build de produção

```bash
npm run build
```

### Preview da build

```bash
npm run preview
```

## Como usar

1. Ajuste sexo, idade e percentil para alterar a escala da mão.
2. Use os painéis para modificar dedos, polegar, punho e grip.
3. Observe a atualização do modelo 3D em tempo real.
4. Selecione uma articulação para ver o destaque visual, o plano de movimento e o valor angular.
5. Teste presets para restaurar posturas iniciais ou funcionais.

## Arquivos centrais

### `src/App.jsx`

Coordena a interface, o estado clínico, a cena 3D e a aplicação do rig.

### `src/hooks/useHandPose.js`

Guarda a pose da mão, os presets e os parâmetros antropométricos.

### `src/hooks/useThreeScene.js`

Cria a cena, câmera, renderer, iluminação e controles orbitais.

### `src/hooks/useHandRig.js`

Constrói o modelo da mão e aplica as rotações com base no estado atual.

### `src/three/buildHandRig.js`

Define a hierarquia de grupos e meshes da mão procedural.

### `src/utils/index.js`

Reúne funções de escala antropométrica, interpolação e apoio matemático.

## Lógica biomecânica atual

O simulador já representa de forma consistente:

* flexão dos dedos D2 a D5
* cadeia MCP, PIP e DIP
* punho com graus de liberdade simplificados
* polegar com múltiplos eixos no CMC

Apesar disso, a modelagem clínica do polegar ainda pode ser refinada. Hoje o rig computacional funciona melhor do que a camada de entrada clínica, porque alguns parâmetros ainda não estão na forma mais intuitiva para medição com goniômetro por fisioterapeutas.

## Limitações atuais

* O polegar ainda pode ser difícil de parametrizar clinicamente na interface
* O punho está simplificado em relação à biomecânica real
* O modelo usa geometria procedural e não uma malha anatômica validada
* O fechamento global usa interpolação por keyframes, não um modelo cinemático completo
* O sistema ainda não está conectado a ficha clínica real ou banco de dados

## Próximos passos sugeridos

* Reestruturar a UI do polegar para entradas mais clínicas e intuitivas
* Refinar a lógica do punho
* Integrar prescrição clínica real ao simulador
* Adicionar exportação dos parâmetros prescritos
* Incorporar validação biomecânica mais robusta
* Evoluir para um fluxo conectado ao design da órtese

## Público de interesse

* fisioterapeutas
* terapeutas ocupacionais
* médicos fisiatras
* engenheiros biomédicos
* designers e desenvolvedores de tecnologia assistiva
* pesquisadores em reabilitação e modelagem 3D

## Licença

Defina aqui a licença do projeto.

```text
MIT
```


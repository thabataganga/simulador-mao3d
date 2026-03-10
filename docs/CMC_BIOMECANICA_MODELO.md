# Modelagem Biomecanica Computacional da CMC do Polegar (F/E e Abd/Ad)

## 1) Objetivo

Este documento formaliza, com linguagem matematica, como o simulador modela a articulacao CMC do polegar para:

- Flexao/Extensao (F/E)
- Abducao/Aducao (Abd/Ad)

O foco e descrever a implementacao atual do projeto: mapeamento direto, problema inverso, medicao goniometrica no rig, calibracao de baseline, erro/saturacao e rastreabilidade em codigo.

## 2) Glossario matematico e convencoes

### 2.1 Variaveis de entrada clinica (comando)

Seja o vetor de comando clinico:

\[
\mathbf{u} =
\begin{bmatrix}
u_{abd} \\
u_{flex} \\
u_{opp}
\end{bmatrix} \in \mathbb{R}^3
\]

onde:

- \(u_{abd}\): comando clinico de Abducao/Aducao da CMC (graus)
- \(u_{flex}\): comando clinico de Flexao/Extensao da CMC (graus)
- \(u_{opp}\): comando clinico de oposicao/retroposicao (graus)

### 2.2 Variaveis no rig 3D

\[
\boldsymbol{\theta} =
\begin{bmatrix}
\theta_{abd} \\
\theta_{flex} \\
\theta_{pro}
\end{bmatrix}
\]

onde:

- \(\theta_{abd}\): rotacao aplicada em `thumb.cmcFlexExt.rotation.z`
- \(\theta_{flex}\): rotacao aplicada em `thumb.cmcAbdAdd.rotation.y`
- \(\theta_{pro}\): rotacao aplicada em `thumb.cmcPronation.rotation.x`

### 2.3 Convencao de sinal clinico

- \(+\): abducao e flexao
- \(-\): aducao e extensao

Implementacao em: `src/domain/thumbCmcClinical.js` (`AXIS_CONFIG`) e `src/components/ThumbPanel.jsx` (rotulos/direcoes).

### 2.4 Constantes do modelo atual

Da constante `THUMB_CMC`:

- \(s_{abd} = 1\) (`CLINICAL_FLEX_EXT_SIGN`)
- \(g_{abd} = 0.18\) (`OPP_COUPLING.FLEX_EXT_GAIN`)
- \(g_{flex} = 0.22\) (`OPP_COUPLING.ABD_ADD_GAIN`)
- \(g_{pro} = 0.38\) (`OPP_COUPLING.PRONATION_GAIN`)

Implementacao em: `src/constants/biomechanics.js`.

## 3) Mapeamento direto (clinico -> rig)

O mapeamento computacional da CMC e afim:

\[
\theta_{abd} = s_{abd} \, u_{abd} + g_{abd} \, u_{opp}
\]
\[
\theta_{flex} = u_{flex} + g_{flex} \, u_{opp}
\]
\[
\theta_{pro} = g_{pro} \, u_{opp}
\]

Forma matricial:

\[
\boldsymbol{\theta}
=
\underbrace{
\begin{bmatrix}
s_{abd} & 0 & g_{abd} \\
0 & 1 & g_{flex} \\
0 & 0 & g_{pro}
\end{bmatrix}
}_{\mathbf{A}}
\mathbf{u}
\]

Em radianos para o Three.js:

\[
\boldsymbol{\theta}_{rad} = \frac{\pi}{180}\,\boldsymbol{\theta}
\]

Implementacao em:

- `src/domain/thumbCmcMapping.js`
  - `mapClinicalCmcToRigAngles`
  - `mapClinicalCmcToRigRadians`
- `src/hooks/handRig/pose.js`
  - `applyPoseToRig` (aplica nos nos `cmcFlexExt`, `cmcAbdAdd`, `cmcPronation`)

## 4) Restricoes, intervalos e clamp

Antes do mapeamento, os comandos sao limitados:

\[
u_i \leftarrow \operatorname{clamp}(u_i; [u_{i,\min}, u_{i,\max}])
\]

Para \(u_{abd}\) e \(u_{flex}\), os intervalos sao ajustados pela influencia de \(u_{opp}\), para manter alvo clinico alcancavel apos acoplamento:

\[
\mathcal{U}_{abd} = [u_{abd,\min}^{adj}, u_{abd,\max}^{adj}]
\]
\[
\mathcal{U}_{flex} = [u_{flex,\min}^{adj}, u_{flex,\max}^{adj}]
\]

Implementacao em:

- `src/domain/thumbCmcMapping.js`
  - `getCmcCommandRange`
  - `clampClinicalCmc`

## 5) Problema inverso (alvo goniometrico -> comando)

## 5.1 Definicao do problema

Para cada eixo \(a \in \{abd, flex\}\), dado um alvo medido \(y_a^\*\), o solver busca:

\[
\hat{u}_a
=
\arg\min_{u_a \in \mathcal{U}_a}
\left| f_a(u_a; \mathbf{u}_{\neg a}) - y_a^\* \right|
\]

onde:

- \(\mathcal{U}_a\): dominio discreto de comandos do eixo
- \(\mathbf{u}_{\neg a}\): demais comandos fixos no contexto atual
- \(f_a\): predicao de medida para o eixo \(a\), via mapeamento direto

## 5.2 Discretizacao usada no codigo

\[
\mathcal{U}_a = \{u_{a,\min}, u_{a,\min}+1, \ldots, u_{a,\max}\}
\]

Passo de busca: \(1^\circ\).

Erro por candidato:

\[
e_a(u_a)=\left|f_a(u_a;\mathbf{u}_{\neg a})-y_a^\*\right|
\]

Erro minimo:

\[
e_a^{min}=\min_{u_a\in\mathcal{U}_a} e_a(u_a)
\]

Saturacao:

\[
\text{saturado} \iff e_a^{min} > 1^\circ
\]

Em empate de erro, escolhe-se o comando mais proximo do alvo \(y_a^\*\).

Implementacao em:

- `src/domain/thumbCmcClinical.js`
  - `solveCmcCommandForMeasuredTarget`
  - `buildCmcInputStateForAxis`
- teste de consistencia:
  - `src/domain/thumbGoniometry.test.js` (casos de alcance e saturacao)

## 5.3 Conversao direcao+magnitude -> alvo assinado

Na UI, o usuario define direcao e magnitude. O modelo converte para alvo assinado:

\[
y_a^\* =
\begin{cases}
+|m_a|, & \text{se direcao positiva}\\
-|m_a|, & \text{se direcao negativa}
\end{cases}
\]

Implementacao em: `src/domain/thumbCmcClinical.js` (`toSignedFromDirection`).

## 6) Medicao goniometrica no rig

O sistema produz:

- medida composta \(y^{comp}\): inclui efeito de oposicao
- medida isolada \(y^{iso}\): remove acoplamento de oposicao
- medida calibrada \(y^{cal}\): remove baseline neutra

## 6.1 Leitura composta

Via rotacoes do rig:

\[
y_{abd}^{comp} \approx \theta_{abd}, \quad
y_{flex}^{comp} \approx \theta_{flex}
\]

ou, alternativamente, por geometria vetorial no referencial da palma (fallback).

Implementacao em: `src/domain/thumbCmcRigMeasure.js` (`readComposedFromRig`).

## 6.2 Angulo assinado em plano (forma vetorial)

Para vetores projetados \(\mathbf{v}_1,\mathbf{v}_2\) e normal de plano \(\mathbf{n}\):

\[
\alpha=
\operatorname{atan2}
\left(
\mathbf{n}\cdot(\mathbf{v}_1\times\mathbf{v}_2),
\mathbf{v}_1\cdot\mathbf{v}_2
\right)
\]

Projecao no plano:

\[
\Pi_{\mathbf{n}}(\mathbf{v})
=
\mathbf{v}
-\frac{\mathbf{v}\cdot\mathbf{n}}{\|\mathbf{n}\|^2}\mathbf{n}
\]

Implementacao relacionada:

- `src/domain/thumbCmcRigMeasure.js`
  - `projectOnPlane`
  - `signedAngleOnPlane`
- `src/domain/thumbFrameUtils.js`
  - transformacao para referencial da palma

## 6.3 Isolamento sem acoplamento de oposicao

\[
y_{abd}^{iso} = y_{abd}^{comp} - s_{abd}g_{abd}u_{opp}
\]
\[
y_{flex}^{iso} = y_{flex}^{comp} - g_{flex}u_{opp}
\]

Implementacao em: `src/domain/thumbCmcRigMeasure.js` (`deriveIsolatedFromComposed`).

## 6.4 Calibracao de baseline

Seja \(\mathbf{b}=[b_{abd},b_{flex}]^\top\) medido na pose neutra inicial do rig:

\[
y_a^{cal} = y_a^{iso} - b_a,\quad a\in\{abd,flex\}
\]

Implementacao em:

- `src/hooks/handRig/runtime.js`
  - calcula baseline ao criar rig (`cmcBaselineRef`)
- `src/domain/thumbCmcRigMeasure.js`
  - aplica baseline em `measureThumbCmcGoniometryFromRig`

## 7) Erro, emissao e estabilidade numerica

Delta clinico por eixo:

\[
\Delta_a = y_a^{cal} - y_a^\*
\]

No modelo clinico exibido ao usuario:

- `deltaDeg = measuredDeg - targetMeasuredDeg`

Implementacao em: `src/domain/thumbCmcClinical.js` (`buildAxisClinicalModel`).

A emissao para UI usa histerese por epsilon:

\[
|\Delta y_{abd}| > \varepsilon \;\;\vee\;\; |\Delta y_{flex}| > \varepsilon
\]

Implementacao em:

- `src/hooks/handRig/pose.js` (`didGoniometryChange`)
- `src/hooks/handRig/constants.js` (`GONIOMETRY_EMIT_EPSILON`)

## 8) Encadeamento computacional completo

\[
(\text{direcao},\text{magnitude})
\to y^\*
\to \hat{u}
\to \boldsymbol{\theta}
\to \text{pose 3D}
\to y^{comp}
\to y^{iso}
\to y^{cal}
\to \Delta
\to \text{feedback UI}
\]

Implementacao principal:

- entrada/estado clinico:
  - `src/hooks/handPose/handlers/core.js`
  - `src/hooks/handPose/selectors.js`
- aplicacao no rig + medicao:
  - `src/hooks/handRig/pose.js`
  - `src/hooks/handRig/runtime.js`

## 9) Extensao analitica (complementar, nao implementada)

Para analise continua local (sem alterar o algoritmo discreto atual), o mapeamento afim admite jacobiano constante:

\[
\dot{\boldsymbol{\theta}}
=
\mathbf{J}(\mathbf{u})\dot{\mathbf{u}},\quad
\mathbf{J}=\frac{\partial\boldsymbol{\theta}}{\partial\mathbf{u}}=\mathbf{A}
\]

Com:

\[
\mathbf{A}=
\begin{bmatrix}
s_{abd} & 0 & g_{abd} \\
0 & 1 & g_{flex} \\
0 & 0 & g_{pro}
\end{bmatrix}
\]

Um funcional de erro temporal (interpretativo) pode ser escrito como:

\[
\mathcal{L}
=
\int_{t_0}^{t_1}
\left\|
\mathbf{y}(t)-\mathbf{y}^\*(t)
\right\|_2^2
\,dt
\]

Nota: a implementacao atual e estatica por frame com busca discreta em graus inteiros; esta secao e apenas interpretacao matematica complementar.

## 10) Fontes internas (rastreabilidade)

- `src/constants/biomechanics.js`
- `src/domain/thumbCmcMapping.js`
- `src/domain/thumbCmcClinical.js`
- `src/domain/thumbCmcRigMeasure.js`
- `src/domain/thumbFrameUtils.js`
- `src/hooks/handRig/pose.js`
- `src/hooks/handRig/runtime.js`
- `src/hooks/handPose/handlers/core.js`
- `src/hooks/handPose/selectors.js`
- `src/domain/thumbGoniometry.test.js`
- `src/domain/thumbKinematics.test.js`
- `src/domain/thumbKapandji.test.js`
- `MANUAL-DE-GONIOMETRIA-FINAL.pdf`

## 11) Fontes externas primarias

1. Hollister A, Buford WL, Myers LM, Giurintano DJ, Novick A. The axes of rotation of the thumb carpometacarpal joint. *J Orthop Res*. 1992;10(3):454-460. DOI: 10.1002/jor.1100100319. PMID: 1569508. URL: https://pubmed.ncbi.nlm.nih.gov/1569508/
2. Halilaj E, Rainbow MJ, Got C, et al. In vivo kinematics of the thumb carpometacarpal joint during three isometric functional tasks. *Clin Orthop Relat Res*. 2014;472(4):1114-1122. DOI: 10.1007/s11999-013-3063-y. PMID: 23681597. URL: https://pubmed.ncbi.nlm.nih.gov/23681597/
3. Crisco JJ, Halilaj E, Moore DC, Patel T, Weiss AP, Ladd AL. In Vivo kinematics of the trapeziometacarpal joint during thumb extension-flexion and abduction-adduction. *J Hand Surg Am*. 2015;40(2):289-296. DOI: 10.1016/j.jhsa.2014.10.062. PMID: 25542440. URL: https://pubmed.ncbi.nlm.nih.gov/25542440/
4. Crisco JJ, Patel T, Halilaj E, Moore DC. The Envelope of Physiological Motion of the First Carpometacarpal Joint. *J Biomech Eng*. 2015;137(10):101002. DOI: 10.1115/1.4031117. PMID: 26201612. URL: https://pubmed.ncbi.nlm.nih.gov/26201612/
5. Kapandji A. [Clinical test of apposition and counter-apposition of the thumb]. *Ann Chir Main*. 1986;5(1):67-73. DOI: 10.1016/S0753-9053(86)80053-9. PMID: 3963909. URL: https://pubmed.ncbi.nlm.nih.gov/3963909/

## 12) Observacoes finais de aderencia

- O documento descreve o modelo implementado, nao um modelo biomecanico generico.
- O uso de derivadas/integral e complementar e explicitamente separado da implementacao vigente.
- A distincao entre comando, medida composta, medida isolada e medida calibrada foi mantida formalmente:
  - comando: \(u_a\)
  - medida composta: \(y_a^{comp}\)
  - medida isolada: \(y_a^{iso}\)
  - medida calibrada: \(y_a^{cal}\)

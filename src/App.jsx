import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { CMC_TEMP_RANGE } from "./constants/biomechanics";

import { useHandPose } from "./hooks/useHandPose";

import { PoseSetupControls } from "./features/pose-controls";
import { OrderedAccordions } from "./features/control-panel";

const HandScene3D = lazy(() => import("./features/scene3d"));

export default function HandSimulatorApp() {
  const [debugKey, setDebugKey] = useState("off");
  const [openPanel, setOpenPanel] = useState("none");

  const { poseState, poseActions, sceneInput } = useHandPose();
  const { setThumbVal, setActivePreset, setThumbGoniometry, setOppositionEstimate } = poseActions;

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Montserrat:wght@600;700&display=swap";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("qaThumb") !== "1") return;

    const kapandjiRaw = params.get("kapandji");
    if (kapandjiRaw != null) {
      const kapandjiValue = Number(kapandjiRaw);
      if (Number.isFinite(kapandjiValue)) setThumbVal("CMC_opp", kapandjiValue);
    }

    const map = {
      CMC_abd: "cmc_abd",
      CMC_flex: "cmc_flex",
      CMC_opp: "cmc_opp",
      MCP_flex: "mcp_flex",
      IP: "ip",
    };

    Object.entries(map).forEach(([key, queryKey]) => {
      const raw = params.get(queryKey);
      if (raw == null) return;
      const value = Number(raw);
      if (!Number.isFinite(value)) return;
      if (key === "CMC_opp" && kapandjiRaw != null) return;
      setThumbVal(key, value);
    });

    setActivePreset("none");
    setOpenPanel("thumb");
  }, [setActivePreset, setThumbVal]);

  const togglePanel = id => {
    setOpenPanel(prev => {
      const next = prev === id ? "none" : id;
      if (next === "global") setDebugKey("off");
      return next;
    });
  };

  const clearPreset = useCallback(() => poseActions.setActivePreset("none"), [poseActions]);

  const handleGrip = useCallback(
    value => {
      setDebugKey("off");
      poseActions.setGrip(value);
      poseActions.applyGlobalGrip(value);
    },
    [poseActions],
  );

  const handleGlobalMode = useCallback(
    mode => {
      setDebugKey("off");
      poseActions.setGlobalMode(mode);
      poseActions.applyGlobalGrip(poseState.grip, mode);
    },
    [poseActions, poseState.grip],
  );

  return (
    <div
      className="w-full h-screen text-gray-900 flex overflow-hidden"
      style={{
        "--lmb-navy": "#0e1e35",
        "--lmb-coral": "#f04d4f",
        "--lmb-teal": "#3bb7a2",
        "--lmb-ivory": "#f9f8f4",
        "--lmb-blue": "#10315a",
        backgroundColor: "var(--lmb-ivory)",
        fontFamily: '"DM Sans",ui-sans-serif,system-ui',
      }}
    >
      <aside className="w-[420px] max-w-[45%] h-full border-r border-gray-200 p-5 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: '"Montserrat","DM Sans",ui-sans-serif' }}>
          Simulador de Mao 3D
        </h1>
        <p className="text-xs text-gray-500 mb-4">Positivo = flexao/abducao | Negativo = extensao/aducao</p>

        <PoseSetupControls
          sex={poseState.sex}
          percentile={poseState.percentile}
          age={poseState.age}
          activePreset={poseState.activePreset}
          onSex={poseActions.setSex}
          onPercentile={poseActions.setPercentile}
          onAge={poseActions.setAge}
          onPresetFunctional={poseActions.presetFunctional}
          onPresetNeutral={poseActions.presetNeutral}
          onPresetZero={poseActions.presetZero}
        />

        <OrderedAccordions
          openPanel={openPanel}
          onTogglePanel={togglePanel}
          thumb={poseState.thumb}
          thumbGoniometry={poseState.thumbGoniometry}
          thumbClinical={poseState.thumbClinical}
          isExplorationMode={poseState.isExplorationMode}
          explorationKapandjiTarget={poseState.explorationKapandjiTarget}
          onThumbVal={poseActions.setThumbVal}
          onThumbCmcInput={poseActions.setThumbCmcInput}
          onEnterOppositionExploration={poseActions.enterOppositionExploration}
          onUpdateOppositionExploration={poseActions.updateOppositionExploration}
          onRestoreUserInputData={poseActions.restoreUserInputData}
          onExitOppositionExploration={poseActions.exitOppositionExploration}
          onThumbHighlight={setDebugKey}
          onThumbClearHighlight={() => setDebugKey("off")}
          onThumbClearPreset={clearPreset}
          globalD2D5={poseState.globalD2D5}
          onUpdateGlobalD2D5={poseActions.updateGlobalD2D5}
          onGlobalHighlight={setDebugKey}
          onGlobalClearPreset={clearPreset}
          wrist={poseState.wrist}
          onWrist={poseActions.setWrist}
          onWristHighlight={setDebugKey}
          onWristClearPreset={clearPreset}
          grip={poseState.grip}
          globalMode={poseState.globalMode}
          onGlobalMode={handleGlobalMode}
          onGrip={handleGrip}
          onGlobalClearHighlight={() => setDebugKey("off")}
        />

        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer font-medium">Tabela tecnica - Limites</summary>
          <div className="mt-2 space-y-1">
            <p>MCP D2-D5: -45 deg a +90 deg | PIP: 0-100 deg | DIP: -20 deg a +80 deg</p>
            <p>
              CMC Polegar: Abd {CMC_TEMP_RANGE[0]}..+{CMC_TEMP_RANGE[1]} deg | Flex/Ext {CMC_TEMP_RANGE[0]}..+
              {CMC_TEMP_RANGE[1]} deg | Oposicao: {CMC_TEMP_RANGE[0]}..+{CMC_TEMP_RANGE[1]} deg | Kapandji estimado 0..10
            </p>
            <p>MCP Polegar: 0-60 deg | IP: -10 deg a +80 deg</p>
          </div>
        </details>
      </aside>

      <Suspense fallback={<main className="flex-1 grid place-items-center text-sm text-gray-500">Carregando cena 3D...</main>}>
        <HandScene3D
          sceneInput={sceneInput}
          thumbClinical={poseState.thumbClinical}
          thumbGoniometry={poseState.thumbGoniometry}
          debugKey={debugKey}
          onThumbGoniometry={setThumbGoniometry}
          onOppositionEstimate={setOppositionEstimate}
        />
      </Suspense>
    </div>
  );
}

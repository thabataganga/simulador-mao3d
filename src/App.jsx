import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { RANGES } from "./constants/biomechanics";

import { useHandPose } from "./hooks/useHandPose";

import { buildPoseSetupProps, PoseSetupControls } from "./features/pose-controls";
import {
  buildOrderedAccordionsProps,
  clearDebug,
  nextOpenPanel,
  OrderedAccordions,
  shouldClearDebugForPanel,
} from "./features/control-panel";

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

  const onClearDebugKey = useCallback(() => clearDebug(setDebugKey), []);

  const onTogglePanel = useCallback(
    panelId => {
      setOpenPanel(previous => {
        const next = nextOpenPanel(previous, panelId);
        if (shouldClearDebugForPanel(next)) onClearDebugKey();
        return next;
      });
    },
    [onClearDebugKey],
  );

  const onClearPreset = useCallback(() => poseActions.setActivePreset("none"), [poseActions]);

  const onGrip = useCallback(
    value => {
      onClearDebugKey();
      poseActions.setGrip(value);
      poseActions.applyGlobalGrip(value);
    },
    [onClearDebugKey, poseActions],
  );

  const onGlobalMode = useCallback(
    mode => {
      onClearDebugKey();
      poseActions.setGlobalMode(mode);
      poseActions.applyGlobalGrip(poseState.grip, mode);
    },
    [onClearDebugKey, poseActions, poseState.grip],
  );

  const poseSetupProps = buildPoseSetupProps({ poseState, poseActions });
  const orderedAccordionsProps = buildOrderedAccordionsProps({
    poseState,
    poseActions,
    openPanel,
    onTogglePanel,
    onGlobalMode,
    onGrip,
    onClearPreset,
    onSetDebugKey: setDebugKey,
    onClearDebugKey,
  });

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

        <PoseSetupControls {...poseSetupProps} />

        <OrderedAccordions {...orderedAccordionsProps} />

        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer font-medium">Tabela tecnica - Limites</summary>
          <div className="mt-2 space-y-1">
            <p>MCP D2-D5: -45 deg a +90 deg | PIP: 0-100 deg | DIP: -20 deg a +80 deg</p>
            <p>
              CMC Polegar: Abd {RANGES.CMC_ABD[0]}..+{RANGES.CMC_ABD[1]} deg | Flex/Ext {RANGES.CMC_FLEX[0]}..+
              {RANGES.CMC_FLEX[1]} deg | Oposicao: {RANGES.CMC_OPP[0]}..+{RANGES.CMC_OPP[1]} deg | Kapandji estimado 0..10
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

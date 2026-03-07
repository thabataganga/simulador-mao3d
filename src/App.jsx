import { lazy, Suspense, useEffect, useState } from "react";

import { useHandPose } from "./hooks/useHandPose";

import { AccordionItem } from "./components/AccordionItem";
import { AnthropometryForm } from "./components/AnthropometryForm";
import { PresetButtons } from "./components/PresetButtons";
import { GlobalD2D5Panel } from "./components/GlobalD2D5Panel";
import { ThumbPanel } from "./components/ThumbPanel";
import { WristPanel } from "./components/WristPanel";
import { GripPanel } from "./components/GripPanel";

const HandScene3D = lazy(() => import("./components/HandScene3D"));

export default function HandSimulatorApp() {
  const [debugKey, setDebugKey] = useState("off");
  const [openPanel, setOpenPanel] = useState("global_d2d5");

  const { poseState, poseActions, sceneInput } = useHandPose();

  // Fonts loaded dynamically so UI keeps visual identity without blocking first paint.
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Montserrat:wght@600;700&display=swap";
    document.head.appendChild(link);
    return () => {
      if (document.head.contains(link)) document.head.removeChild(link);
    };
  }, []);

  // Optional query-driven thumb pose for QA screenshots.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("qaThumb") !== "1") return;

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
      poseActions.setThumbVal(key, value);
    });

    poseActions.setActivePreset("none");
    setOpenPanel("thumb");
  }, [poseActions]);

  const togglePanel = id => setOpenPanel(prev => (prev === id ? "none" : id));
  const clearPreset = () => poseActions.setActivePreset("none");

  return (
    <div
      className="w-full h-screen text-gray-900 flex overflow-hidden"
      style={{
        "--lmb-navy": "#0e1e35", "--lmb-coral": "#f04d4f",
        "--lmb-teal": "#3bb7a2", "--lmb-ivory": "#f9f8f4",
        "--lmb-blue": "#10315a",
        backgroundColor: "var(--lmb-ivory)",
        fontFamily: '"DM Sans",ui-sans-serif,system-ui',
      }}
    >
      <aside className="w-[420px] max-w-[45%] h-full border-r border-gray-200 p-5 overflow-y-auto">
        <h1 className="text-xl font-semibold mb-1" style={{ fontFamily: '"Montserrat","DM Sans",ui-sans-serif' }}>
          Simulador de Mão 3D
        </h1>
        <p className="text-xs text-gray-500 mb-4">Positivo = flexão/abdução · Negativo = extensão/adução</p>

        <AnthropometryForm
          sex={poseState.sex}
          onSex={poseActions.setSex}
          percentile={poseState.percentile}
          onPercentile={poseActions.setPercentile}
          age={poseState.age}
          onAge={poseActions.setAge}
        />

        <PresetButtons
          activePreset={poseState.activePreset}
          onFunctional={poseActions.presetFunctional}
          onNeutral={poseActions.presetNeutral}
          onZero={poseActions.presetZero}
        />

        <AccordionItem id="global_d2d5" title="Controle global D2-D5" isOpen={openPanel === "global_d2d5"} onToggle={togglePanel}>
          <GlobalD2D5Panel
            globalD2D5={poseState.globalD2D5}
            onUpdate={poseActions.updateGlobalD2D5}
            onHighlight={setDebugKey}
            onClearPreset={clearPreset}
          />
        </AccordionItem>

        <AccordionItem id="thumb" title="D1 - Polegar (CMC, MCP, IP)" isOpen={openPanel === "thumb"} onToggle={togglePanel}>
          <ThumbPanel
            thumb={poseState.thumb}
            onThumbVal={poseActions.setThumbVal}
            onHighlight={setDebugKey}
            onClearPreset={clearPreset}
          />
        </AccordionItem>

        <AccordionItem id="wrist" title="Punho (Flex/Ext, Desvio)" isOpen={openPanel === "wrist"} onToggle={togglePanel}>
          <WristPanel
            wrist={poseState.wrist}
            onWrist={poseActions.setWrist}
            onHighlight={setDebugKey}
            onClearPreset={clearPreset}
          />
        </AccordionItem>

        <AccordionItem id="global" title="Fechamento global" isOpen={openPanel === "global"} onToggle={togglePanel}>
          <GripPanel
            grip={poseState.grip}
            globalMode={poseState.globalMode}
            onGrip={value => {
              poseActions.setGrip(value);
              poseActions.applyGlobalGrip(value);
            }}
          />
        </AccordionItem>

        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer font-medium">Tabela técnica - Limites</summary>
          <div className="mt-2 space-y-1">
            <p>MCP D2-D5: -45° a +90° · PIP: 0-100° · DIP: -20° a +80°</p>
            <p>CMC Polegar: Abd -10..+60° · Flex/Ext -20..+30° · Oposição -40..+70°</p>
            <p>MCP Polegar: 0-60° · IP: -10° a +80°</p>
          </div>
        </details>
      </aside>

      <Suspense fallback={<main className="flex-1 grid place-items-center text-sm text-gray-500">Carregando cena 3D...</main>}>
        <HandScene3D sceneInput={sceneInput} debugKey={debugKey} />
      </Suspense>
    </div>
  );
}


import React, { useEffect, useRef, useState } from "react";

import { useHandPose }   from "./hooks/useHandPose";
import { useThreeScene } from "./hooks/useThreeScene";
import { useHandRig }    from "./hooks/useHandRig";

import { AccordionItem }    from "./components/AccordionItem";
import { AnthropometryForm } from "./components/AnthropometryForm";
import { PresetButtons }    from "./components/PresetButtons";
import { GlobalD2D5Panel }  from "./components/GlobalD2D5Panel";
import { ThumbPanel }       from "./components/ThumbPanel";
import { WristPanel }       from "./components/WristPanel";
import { GripPanel }        from "./components/GripPanel";

export default function HandSimulatorApp() {
  const mountRef    = useRef(null);
  const viewcubeRef = useRef(null);

  const [debugKey,  setDebugKey]  = useState("off");
  const [openPanel, setOpenPanel] = useState("global_d2d5");

  const pose = useHandPose();
  const { three, mini, orbitRef } = useThreeScene(mountRef, viewcubeRef);

  useHandRig({
    three, orbitRef,
    dims:     pose.dims,
    fingers:  pose.fingers,
    thumb:    pose.thumb,
    wrist:    pose.wrist,
    debugKey,
  });

  // Fonte
  useEffect(() => {
    const link = document.createElement("link"); link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Montserrat:wght@600;700&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  const togglePanel = id => setOpenPanel(p => p === id ? "none" : id);
  const clearPreset = () => pose.setActivePreset("none");

  return (
    <div
      className="w-full h-screen text-gray-900 flex overflow-hidden"
      style={{
        "--lmb-navy":  "#0e1e35", "--lmb-coral": "#f04d4f",
        "--lmb-teal":  "#3bb7a2", "--lmb-ivory": "#f9f8f4",
        "--lmb-blue":  "#10315a",
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
          sex={pose.sex}         onSex={pose.setSex}
          percentile={pose.percentile} onPercentile={pose.setPercentile}
          age={pose.age}         onAge={pose.setAge}
        />

        <PresetButtons
          activePreset={pose.activePreset}
          onFunctional={pose.presetFunctional}
          onNeutral={pose.presetNeutral}
          onZero={pose.presetZero}
        />

        <AccordionItem id="global_d2d5" title="Controle global D2–D5" isOpen={openPanel === "global_d2d5"} onToggle={togglePanel}>
          <GlobalD2D5Panel
            globalD2D5={pose.globalD2D5}
            onUpdate={pose.updateGlobalD2D5}
            onHighlight={setDebugKey}
            onClearPreset={clearPreset}
          />
        </AccordionItem>

        <AccordionItem id="thumb" title="D1 – Polegar (CMC, MCP, IP)" isOpen={openPanel === "thumb"} onToggle={togglePanel}>
          <ThumbPanel
            thumb={pose.thumb}
            onThumbVal={pose.setThumbVal}
            onHighlight={setDebugKey}
            onClearPreset={clearPreset}
          />
        </AccordionItem>

        <AccordionItem id="wrist" title="Punho (Flex/Ext, Desvio)" isOpen={openPanel === "wrist"} onToggle={togglePanel}>
          <WristPanel
            wrist={pose.wrist}
            onWrist={pose.setWrist}
            onHighlight={setDebugKey}
            onClearPreset={clearPreset}
          />
        </AccordionItem>

        <AccordionItem id="global" title="Fechamento global" isOpen={openPanel === "global"} onToggle={togglePanel}>
          <GripPanel
            grip={pose.grip}
            globalMode={pose.globalMode}
            onGrip={v => { pose.setGrip(v); pose.applyGlobalGrip(v); }}
          />
        </AccordionItem>

        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer font-medium">Tabela técnica – Limites</summary>
          <div className="mt-2 space-y-1">
            <p>MCP D2–D5: −45° a +90° · PIP: 0–100° · DIP: −20° a +80°</p>
            <p>CMC Polegar: Abd −10..+60° · Flex 0..30° · Oposição −40..+70°</p>
            <p>MCP Polegar: 0–60° · IP: −10° a +80°</p>
          </div>
        </details>
      </aside>

      <main className="flex-1 relative">
        <div ref={mountRef} className="absolute inset-0" />
        <div ref={viewcubeRef} className="absolute top-4 right-4 rounded-md shadow-sm bg-white/60 p-1" />
      </main>
    </div>
  );
}
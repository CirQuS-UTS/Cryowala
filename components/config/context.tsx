"use client"

import { FC, PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react"
import defaultFridge from "@/components/config/GUIconfig.json"
import { FridgeConfig, StageConfig, CableConfig, LineConfig, SegmentConfig } from "@/components/pyodide/fridge.d"
import { useFeatureFlags } from "./featureFlagContext"

export type FridgeContext = FridgeConfig & {
  setStages: (stages: StageConfig[]) => void,
  setCables: (cables: CableConfig[]) => void,
  setLines: (lines: LineConfig[]) => void,
  setSegments: (segments: SegmentConfig[]) => void,
  import: (fridge: FridgeConfig) => void,
  export: () => FridgeConfig
  reset: () => void,
  load: () => void,
  save: () => void,
}

const defaultFridgeContext: FridgeContext = {
  stages: defaultFridge.FridgeUTS.stages as StageConfig[],
  cables: defaultFridge.FridgeUTS.cables as CableConfig[],
  lines: defaultFridge.FridgeUTS.lines as LineConfig[],
  segments: defaultFridge.FridgeUTS.segments as SegmentConfig[],
  setStages: () => { },
  setCables: () => { },
  setLines: () => { },
  setSegments: () => { },
  import: () => { },
  export: () => defaultFridge.FridgeUTS as FridgeConfig,
  reset: () => { },
  load: () => { },
  save: () => { },
};

const fridgeContext = createContext<FridgeContext>(defaultFridgeContext);
export const useFridge = () => useContext(fridgeContext);

// eslint-disable-next-line max-lines-per-function
export const FridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const [stages, setStagesRaw] = useState<StageConfig[]>([]);
  const [cables, setCables] = useState<CableConfig[]>([]);
  const [lines, setLines] = useState<LineConfig[]>([]);
  const [segments, setSegments] = useState<SegmentConfig[]>([]);

  const featureFlags = useFeatureFlags();

  // Ensure that the stages are always sorted by index
  const setStages = useMemo(() => (stages: StageConfig[]) => {
    if (featureFlags.staticStageCount && stages.length != 5) throw new Error('Fridge Configuration must have exactly 5 stages.')
    const sorted = stages;
    stages.sort((a, b) => a.index - b.index);
    setStagesRaw(sorted);
  }, [setStagesRaw]);

  const importConfig = useMemo(() => (fridge: FridgeConfig) => {
    setStages(fridge.stages);
    setCables(fridge.cables);
    setLines(fridge.lines);
    setSegments(fridge.segments);
  }, [setStages, setCables, setLines, setSegments]);
  const exportConfig = useMemo(() => () => {
    return { stages, cables, lines, segments };
  }, [stages, cables, lines, segments]);

  const reset = useMemo(() => () => {
    importConfig(defaultFridge.FridgeUTS as FridgeConfig);
  }, [importConfig]);

  const load = useMemo(() => () => {
    const fridgeJSON = JSON.parse(localStorage.getItem("fridge") || JSON.stringify(defaultFridge.FridgeUTS));
    importConfig(fridgeJSON);
  }, [importConfig]);

  const save = useMemo(() => () => {
    localStorage.setItem("fridge", JSON.stringify(exportConfig()));
  }, [exportConfig]);

  useEffect(() => {
    load();
  }, [load]);

  const fridge: FridgeContext = {
    stages: stages,
    setStages: setStages,
    cables: cables,
    setCables: setCables,
    lines: lines,
    setLines: setLines,
    segments: segments,
    setSegments: setSegments,
    import: importConfig,
    export: exportConfig,
    reset: reset,
    load: load,
    save: save,
  };

  return (
    <fridgeContext.Provider value={fridge}>
      {children}
    </fridgeContext.Provider>
  );
};
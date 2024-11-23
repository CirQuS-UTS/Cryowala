"use client"

import { useFridge } from "@/components/config/context"
import { useMemo } from 'react';
import { CryoModel, useCryogenicModel } from '@/components/pyodide';
import { Field } from '@/components/graphs/common';
import ClusteredBarGraph from '@/components/graphs/clusteredBarGraph';
import StackedBarGraph from '@/components/graphs/stackedBarGraph';
import { activeDrive, activeFlux, passiveDrive, passiveFlux, passiveOutput, driveNoise, fluxNoise, applyLineTransformations, sumLineLoadOutputs } from '@/components/pyodide/fridge';
import { StageConfig, FridgeConfig } from '@/components/pyodide/fridge.d';
import { DualAxisGraph } from "@/components/graphs/dualAxisBarGraph";
import { useDimensions } from "@/components/wiremap/wrapper";
import { WithPythonRuntime } from "@/lib/pythonrt";

type HeatLoad = {
  name: string,
  totalHeatLoad: number,
  passiveDrive: number,
  passiveFlux: number,
  passiveOutput: number,
  activeDrive: number,
  activeFlux: number,
}

type Noise = {
  name: string,
  driveNoise: number,
  fluxNoise: number,
}

function evaluateFridgeHeatLoad(model: CryoModel, fridge: FridgeConfig): HeatLoad[] {
  const pDrive = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, passiveDrive(model, fridge), true));
  const pFlux = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, passiveFlux(model, fridge), true));
  const pOutput = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, passiveOutput(model, fridge), true));
  const aDrive = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, activeDrive(model, fridge), true));
  const aFlux = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, activeFlux(model, fridge), true));

  const stages = fridge.stages.map((stage: StageConfig) => stage.id);

  return stages.map((stage: string) => ({
    name: stage,
    totalHeatLoad: pDrive[stage] + pFlux[stage] + pOutput[stage] + aDrive[stage] + aFlux[stage],
    passiveDrive: pDrive[stage],
    passiveFlux: pFlux[stage],
    passiveOutput: pOutput[stage],
    activeDrive: aDrive[stage],
    activeFlux: aFlux[stage],
  }));
};

function evaluateFridgeNoise(model: CryoModel, fridge: FridgeConfig): Noise[] {
  const dNoise = driveNoise(model, fridge);
  const fNoise = fluxNoise(model, fridge);

  const stages = ["RT", ...fridge.stages.map((stage: StageConfig) => stage.id)];

  return stages.map((stage: string) => ({
    name: stage,
    driveNoise: dNoise[stage],
    fluxNoise: fNoise[stage],
  }));
};

function evaluateFridgeAbsoluteHeatLoad(model: CryoModel, fridge: FridgeConfig): HeatLoad[] {
  const pDrive = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, passiveDrive(model, fridge)));
  const pFlux = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, passiveFlux(model, fridge)));
  const pOutput = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, passiveOutput(model, fridge)));
  const aDrive = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, activeDrive(model, fridge)));
  const aFlux = sumLineLoadOutputs(fridge.stages, applyLineTransformations(fridge.stages, activeFlux(model, fridge)));

  const stages = fridge.stages.map((stage: StageConfig) => stage.id);

  return stages.map((stage: string) => ({
    name: stage,
    totalHeatLoad: pDrive[stage] + pFlux[stage] + pOutput[stage] + aDrive[stage] + aFlux[stage],
    passiveDrive: pDrive[stage],
    passiveFlux: pFlux[stage],
    passiveOutput: pOutput[stage],
    activeDrive: aDrive[stage],
    activeFlux: aFlux[stage],
  }));
};

export default function WrappedFridgeGraphs() {
  return (
    <WithPythonRuntime>
      <FridgeGraphs />
    </WithPythonRuntime>
  );
}

// eslint-disable-next-line max-lines-per-function
function FridgeGraphs() {
  const model = useCryogenicModel();
  const fridge = useFridge();

  const dimensions = useDimensions();

  const numGraphs = 3;
  const [graphWidth, graphHeight] = useMemo(() => [dimensions.width / numGraphs, dimensions.height], [dimensions]);

  const [heatLoad, heatLoadErr] = useMemo(() => {
    const { ready, reason } = model.getStatus();
    if (!ready) return [[], reason];

    try {
      const data = evaluateFridgeHeatLoad(model, fridge);
      return [data, null];
    } catch (err) {
      return [[], err];
    }
  }, [model, fridge]);

  const [absoluteHeatLoad, absoluteHeatLoadErr] = useMemo(() => {
    const { ready, reason } = model.getStatus();
    if (!ready) return [[], reason];

    try {
      const data = evaluateFridgeAbsoluteHeatLoad(model, fridge);
      return [data, null];
    } catch (err) {
      return [[], err];
    }
  }, [model, fridge]);

  const [noise, noiseErr] = useMemo(() => {
    const { ready, reason } = model.getStatus();
    if (!ready) return [[], reason];

    try {
      const data = evaluateFridgeNoise(model, fridge);
      return [data, null];
    } catch (err) {
      return [[], err];
    }
  }, [model, fridge]);

  const { ready, reason } = model.getStatus();
  if (!ready && reason === "loading") return (<div className="flex flex-row justify-center items-center w-full h-full"><span>Loading...</span></div>);

  if (heatLoadErr || absoluteHeatLoadErr || noiseErr) return (<div>Python Runtime is currently unavailable or in an errored state because:
    {!!heatLoadErr && (<span style={{ display: "block", color: "red", whiteSpace: "pre-wrap" }}>{heatLoadErr.toString()}</span>)}
    {!!absoluteHeatLoadErr && (<span style={{ display: "block", color: "red", whiteSpace: "pre-wrap" }}>{absoluteHeatLoadErr.toString()}</span>)}
    {!!noiseErr && (<span style={{ display: "block", color: "red", whiteSpace: "pre-wrap" }}>{noiseErr.toString()}</span>)}
  </div>);

  const stageField: Field<HeatLoad | Noise, string> = {
    name: "Stage",
    colour: "not applicable",
    accessor: d => d.name,
  };

  const totalHeatLoadField: Field<HeatLoad> = {
    name: "Total Heat Load",
    colour: "lightblue",
    accessor: d => d.totalHeatLoad,
  };

  const passiveDriveField: Field<HeatLoad> = {
    name: "Passive Drive",
    colour: "red",
    accessor: d => d.passiveDrive,
  };

  const passiveFluxField: Field<HeatLoad> = {
    name: "Passive Flux",
    colour: "orange",
    accessor: d => d.passiveFlux,
  };

  const passiveOutputField: Field<HeatLoad> = {
    name: "Passive Output",
    colour: "lightgreen",
    accessor: d => d.passiveOutput,
  };

  const activeDriveField: Field<HeatLoad> = {
    name: "Active Drive",
    colour: "darkgreen",
    accessor: d => d.activeDrive,
  };

  const activeFluxField: Field<HeatLoad> = {
    name: "Active Flux",
    colour: "blue",
    accessor: d => d.activeFlux,
  };

  const driveNoiseField: Field<Noise> = {
    name: `Noise Photons, ${toBar("n")} (s${toSuperscript("-1")}Hz${toSuperscript("-1")})`,
    colour: "red",
    accessor: d => d.driveNoise,
  };

  const fluxNoiseField: Field<Noise> = {
    name: `Noise Current, I${toSuperscript("2")} (A${toSuperscript("2")}Hz${toSuperscript("-1")})`,
    colour: "blue",
    accessor: d => d.fluxNoise,
  };

  const significantFigureToDisplay = 5;
  const toSigFig = (num: number) => num.toExponential(significantFigureToDisplay - 1);
  const heatLoadTooltip = (field: Field<HeatLoad>, data: HeatLoad) => {
    const absoluteData = absoluteHeatLoad.filter((item: HeatLoad) => item.name === data.name)[0];
    return (
      <div>
        <span>Relative {field.name}: {toSigFig(field.accessor(data))}</span>
        <br />
        {absoluteData && (<span>Absolute {field.name}: {toSigFig(field.accessor(absoluteData))}</span>)}
      </div>
    )
  }

  const noiseTooltip = (field: Field<Noise>, data: Noise) => {
    return (
      <div>
        <span>{field.name.split(",")[0]}: {field.accessor(data)}</span>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-evenly", padding: "0", margin: "0" }}>
      <DualAxisGraph<Noise> width={graphWidth} height={graphHeight}
        data={noise}
        labelField={stageField}
        leftAxisField={driveNoiseField}
        rightAxisField={fluxNoiseField}
        tooltip={noiseTooltip}
      />
      <ClusteredBarGraph<HeatLoad> width={graphWidth} height={graphHeight}
        data={heatLoad}
        labelField={stageField}
        yLabel="Heat Load, P/P_cooling"
        backgroundField={totalHeatLoadField}
        foregroundFields={[passiveDriveField, passiveFluxField, passiveOutputField, activeDriveField, activeFluxField]}
        tooltip={heatLoadTooltip}
      />
      <StackedBarGraph<HeatLoad> width={graphWidth} height={graphHeight}
        data={heatLoad}
        labelField={stageField}
        yLabel="Heat Load, P/P_cooling"
        fields={[passiveDriveField, passiveFluxField, passiveOutputField, activeDriveField, activeFluxField]}
        tooltip={heatLoadTooltip}
      />
    </div>
  );
}

const superScriptMapping: Record<string, string> = {
  '0': '\u2070',
  '1': '\u00B9',
  '2': '\u00B2',
  '3': '\u00B3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079',
  '+': '\u207A',
  '-': '\u207B',
  '=': '\u207C',
  '(': '\u207D',
  ')': '\u207E',
  'n': '\u207F',
  'i': '\u2071',
}
function toSuperscript(str: string) {
  return str.split("").map(c => superScriptMapping[c]).join("");
}

function toBar(str: string) {
  return str.split("").map(c => c + "\u0304").join("");
}
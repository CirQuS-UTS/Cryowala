"use client";

import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { CryoModel, useCryogenicModel } from '@/components/pyodide';
import { FridgeContext, useFridge } from '@/components/config/context';
import { linspace, sweepModel, sweepModel2D } from '@/components/pyodide/fridge';
import ColourGraph from '@/components/graphs/colourGraph';
import { FridgeConfig, SweepResults2D } from '@/components/pyodide/fridge.d';
import { useDimensions } from "@/components/useDimensions";
import { SideBarContent } from '@/components/sideBar';
import { interpolatePlasma, interpolateViridis } from 'd3-scale-chromatic';
import SelectInput, { SegmentedSelect as MultipleSelectionInput } from '@/components/inputs/single_value/select';
import TextInput from '@/components/inputs/single_value/text';
import NumberInput from '@/components/inputs/single_value/number';
import { CryoModelInterface } from '@/components/pyodide/types';
import GraphDisplayTable from '@/components/inputs/graphDisplayTable';
import NoiseDisplayTable from '@/components/inputs/noiseDisplayTable';
import GraphControl2D from '@/components/inputs/graphControl2D';
import SweepConfigTransfer from '@/components/inputs/sweepConfigTransfer';
import OneDSweepGraphs from '@/components/oneDSweepGraphs';
import Modal from '@/components/inputs/modal';
import ModalGraphControl2D from '@/components/inputs/modalGraphControls2D';

const noiseTypes: string[] = ['Photons', 'Current', 'Voltage'];

export type SweepData = {
  range: number,
  lines: number[],
  labels: string[],
  colours: string[]
};

// eslint-disable-next-line max-lines-per-function
function filterLines(data: SweepData[], graphID: number, lineSignalTypes: ("Drive" | "Flux" | "Output")[], selected: boolean[][][], showTotalLines: boolean[], nSelected: boolean[] = []): SweepData[] {
  const switches: [number, number][] = [];
  const result: SweepData[] = [];
  if (graphID < selected.length) {
    for (let i = 0; i < selected[graphID].length; i++) {
      switches.push([i, 0]);
      if (lineSignalTypes[i] != 'Output') {
        switches.push([i, 1]);
        switches.push([i, 2]);
      }
    }
  }
  for (let d = 0; d < data.length; d++) {
    const dLines: number[] = [];
    const dLabels: string[] = [];
    const dColours: string[] = [];
    for (let l = 0; l < data[d].lines.length; l++) {
      if (graphID == selected.length) {
        if (nSelected[l]) {
          dLines.push(data[d].lines[l]);
          dLabels.push(data[d].labels[l]);
          dColours.push(data[d].colours[l]);
        }
      } else if (l == data[d].lines.length - 1) {
        if (showTotalLines[graphID]) {
          dLines.push(data[d].lines[data[d].lines.length - 1]);
          dLabels.push(data[d].labels[data[d].lines.length - 1]);
          dColours.push(data[d].colours[data[d].lines.length - 1]);
        }
      } else {
        if (graphID < selected.length && selected[graphID][switches[l][0]][switches[l][1]]) {
          dLines.push(data[d].lines[l]);
          dLabels.push(data[d].labels[l]);
          dColours.push(data[d].colours[l]);
        }
      }
    }
    result.push({ range: data[d].range, lines: dLines, labels: dLabels, colours: dColours });
  }
  return result;
}

export type SweepDataObject = {
  sweepData: SweepData[][][],
  noiseData: SweepData[][],
  colours: {
    line: string[],
    noise: string[]
  }
}

// eslint-disable-next-line max-lines-per-function
function evalSweepData(model: CryoModel, fridge: FridgeConfig, config: SweepConfiguration): SweepDataObject {
  const [recData, outputTypes] = sweepModel(
    model,
    fridge,
    {
      start: config.start,
      end: config.end,
      points: config.points
    },
    config.constraints,
    config.lineID,
    config.isSamplingLinear
  );

  const stages = fridge.stages.map(s => s.id);
  const sweepData: SweepData[][][] = [stages.map(() => []), stages.map(() => [])];
  const noiseSweep: SweepData[][] = noiseTypes.map(() => []);
  const lines = fridge.lines.map(l => l.id);
  const noiseLineNames = ['RT', ...stages];
  const lineTypes = ["Passive", "Active", "Total"];

  const lineColourTypes: number[] = lines.map((x, i) => ((360 / lines.length) * i));
  var lineColours: string[] = [];

  const noiseColours: string[] = noiseLineNames.map((x, i) => 'hsl(' + ((300 / noiseLineNames.length) * i) + ', 80%, 50%)');
  noiseColours.push("black");

  noiseLineNames.push('Total Load');


  for (let i = 0; i < recData['range'].length; i++) {
    const noiseLines: number[][] = noiseTypes.map(() => []);
    for (let k = 0; k < stages.length; k++) {
      const lineArr: number[] = [];
      const lineLabels: string[] = [];
      lineColours = [];
      for (let l = 0; l < outputTypes.length; l++) {
        const varName: string = String(stages[k] + '_' + outputTypes[l][0] + outputTypes[l][1]);
        lineArr.push(recData[varName][i]);
        lineLabels.push(outputTypes[l][1] + ' (' + outputTypes[l][0] + ')');
        for (let c = 0; c < lines.length; c++) {
          if (lines[c] === outputTypes[l][0]) {
            for (let hsl = 0; hsl < lineTypes.length; hsl++) {
              if (lineTypes[hsl] === outputTypes[l][1]) lineColours.push('hsl(' + lineColourTypes[c] + ', 80%, ' + (55 - (hsl * 15)) + '%)');
            }
          }
        }
      }
      sweepData[0][k].push({
        'range': recData['range'][i],
        'lines': [...lineArr, recData[String(stages[k] + '_TotalHeatLoad')][i]],
        'labels': [...lineLabels, 'Total Heat Load'],
        'colours': [...lineColours, 'black']
      });
      sweepData[1][k].push({
        'range': recData['range'][i],
        'lines': [recData[String(stages[k] + '_TotalTemperature')][i]],
        'labels': ['Total Temperature'],
        'colours': ['black']
      });
      for (let n = 0; n < noiseTypes.length; n++) {
        noiseLines[n].push(recData[String(stages[k] + '_Noise' + noiseTypes[n])][i])
      }
    }
    for (let n = 0; n < noiseTypes.length; n++) {
      noiseSweep[n].push({
        'range': recData['range'][i],
        'lines': [recData['RT_Noise' + noiseTypes[n]][i], ...noiseLines[n], recData['total_Noise' + noiseTypes[n]][i]],
        'labels': noiseLineNames,
        'colours': noiseColours
      });
    }
  }
  return {
    sweepData,
    noiseData: noiseSweep,
    colours: {
      line: lineColours,
      noise: noiseColours
    }
  };
}

export type twoDGraphData = {
  // name: string,
  name: GraphType2D,
  shape: {
    x: number[],
    y: number[]
  },
  data: number[][],
  colourlabel: string
}

// eslint-disable-next-line max-lines-per-function
function get2DGraphValues(data: SweepResults2D, target: GraphType2D, stages: string[]): twoDGraphData {
  if (target.type === 'Heat Load') {
    for (let i = 0; i < stages.length; i++) {
      if (target.target == stages[i]) return {
        name: target,
        shape: data.shape,
        data: data.heat_loads.map(r => r.map(c => c[target.target])),
        colourlabel: "P/P_cooling"
      }
    }
  } else if (target.type === 'Temperature') {
    for (let i = 0; i < stages.length; i++) {
      if (target.target == stages[i]) return {
        name: target,
        shape: data.shape,
        data: data.temperatures.map(r => r.map(c => c[target.target])),
        colourlabel: "P/P_cooling"
      }
    }
  } else if (target.type === 'Noise') {
    if (target.target == 'Photons') {
      return {
        name: target,
        shape: data.shape,
        data: data.noise.map(r => r.map(c => c['photons'])),
        colourlabel: "Noise"
      }
    } else if (target.target == 'Current') {
      return {
        name: target,
        shape: data.shape,
        data: data.noise.map(r => r.map(c => c['current'])),
        colourlabel: "Noise"
      }
    } else if (target.target == 'Voltage') {
      return {
        name: target,
        shape: data.shape,
        data: data.noise.map(r => r.map(c => c['voltage'])),
        colourlabel: "Noise"
      }
    }
  }
  throw new Error("No data matching target '" + target.type + target.target + "' was found.")
}

export type SweepConfiguration = {
  isTwoDimensional: boolean;
  lineID: string;
  stageID: string;
  start: number;
  end: number;
  points: number;
  isSamplingLinear: boolean;
  constraints: string[];
  lineID2d: string;
  xStageID: string;
  xStart: number;
  xEnd: number;
  xPoints: number;
  yStageID: string;
  yStart: number;
  yEnd: number;
  yPoints: number;
  constraints2d: string[]
}

type SweepConfigProps = {
  config: SweepConfiguration;
  setConfig: (config: SweepConfiguration) => void;
  sweep(): void;
}

type DimensionalControlsProps = {
  fridge: FridgeContext,
  config: SweepConfiguration;
  updateConfig: (update: Partial<SweepConfiguration>) => void;
}

// eslint-disable-next-line max-lines-per-function
function OneDimensionalControls({ fridge, config, updateConfig }: DimensionalControlsProps): ReactNode {
  return (
    <>
      <SweepConfigTransfer
        config={config}
        updateConfig={updateConfig}
      />
      <SelectInput
        type="dropdown"
        label="Line Type"
        options={fridge.lines.map(({ id }) => id)}
        value={config.lineID}
        onChange={(value) => updateConfig({ lineID: value })}
        rounded
        shadow
      />
      <SelectInput
        type="dropdown"
        label="Sweep Variable"
        options={fridge.stages.map(({ id }) => id)}
        value={config.stageID}
        onChange={(value) => updateConfig({ stageID: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep Start"
        value={config.start}
        onChange={(value) => updateConfig({ start: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep End"
        value={config.end}
        onChange={(value) => updateConfig({ end: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep Points"
        value={config.points}
        onChange={(value) => updateConfig({ points: value })}
        rounded
        shadow
      />
      <SelectInput
        type="segmented"
        label="Sweep Sampling"
        options={["Linear", "Logarithmic"]}
        value={config.isSamplingLinear ? "Linear" : "Logarithmic"}
        onChange={(value) => updateConfig({ isSamplingLinear: value === "Linear" })}
        rounded
        shadow
      />
      <div className="flex flex-col justify-center items-center w-full shadow-radial shadow-zinc-500 rounded-lg">
        <p className="text-center text-lg w-full p-2 text-white bg-zinc-800 rounded-t-lg">
          Constraints
        </p>
        {fridge.stages.map((stage, index) => (
          <TextInput
            key={stage.id}
            label={stage.id}
            value={config.constraints[index]}
            onChange={(value) => updateConfig({ constraints: config.constraints.toSpliced(index, 1, value) })}
            className={stage.id === config.stageID ? "!bg-gray-300 cursor-not-allowed" : ""}
            disabled={stage.id === config.stageID}
          />
        ))}
      </div>
    </>
  )
}

// eslint-disable-next-line max-lines-per-function
function TwoDimensionalControls({ fridge, config, updateConfig }: DimensionalControlsProps): ReactNode {
  return (
    <>
      <SweepConfigTransfer
        config={config}
        updateConfig={updateConfig}
      />
      <SelectInput
        type="dropdown"
        label="Line Type"
        options={fridge.lines.map(({ id }) => id)}
        value={config.lineID2d}
        onChange={(value) => updateConfig({ lineID2d: value })}
        rounded
        shadow
      />
      <h1 className="text-center font-bold">X Axis</h1>
      <SelectInput
        type="dropdown"
        label="Sweep Variable"
        options={fridge.stages.map(({ id }) => id).filter((id) => id != config.yStageID)}
        value={config.xStageID}
        onChange={(value) => updateConfig({ xStageID: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep Start"
        value={config.xStart}
        onChange={(value) => updateConfig({ xStart: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep End"
        value={config.xEnd}
        onChange={(value) => updateConfig({ xEnd: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep Points"
        value={config.xPoints}
        onChange={(value) => updateConfig({ xPoints: value })}
        rounded
        shadow
      />
      <h1 className="text-center font-bold">Y Axis</h1>
      <SelectInput
        type="dropdown"
        label="Sweep Variable"
        options={fridge.stages.map(({ id }) => id).filter((id) => id != config.xStageID)}
        value={config.yStageID}
        onChange={(value) => updateConfig({ yStageID: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep Start"
        value={config.yStart}
        onChange={(value) => updateConfig({ yStart: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep End"
        value={config.yEnd}
        onChange={(value) => updateConfig({ yEnd: value })}
        rounded
        shadow
      />
      <NumberInput
        label="Sweep Points"
        value={config.yPoints}
        onChange={(value) => updateConfig({ yPoints: value })}
        rounded
        shadow
      />
      <div className="flex flex-col justify-center items-center w-full shadow-radial shadow-zinc-500 rounded-lg">
        <p className="text-center text-lg w-full p-2 text-white bg-zinc-800 rounded-t-lg">
          Constraints
        </p>
        {fridge.stages.map((stage, index) => (
          <TextInput
            key={stage.id}
            label={stage.id}
            value={config.constraints2d[index]}
            onChange={(value) => updateConfig({ constraints2d: config.constraints2d.toSpliced(index, 1, value) })}
            className={(stage.id === config.xStageID || stage.id === config.yStageID) ? "!bg-gray-300 cursor-not-allowed" : ""}
            disabled={(stage.id === config.xStageID || stage.id === config.yStageID)}
          />
        ))}
      </div>
    </>
  )
}

function DimensionalControls({ fridge, config, updateConfig }: DimensionalControlsProps): ReactNode {
  if (config.isTwoDimensional) {
    return (
      <TwoDimensionalControls
        fridge={fridge}
        config={config}
        updateConfig={updateConfig}
      />
    )
  } else {
    return (
      <OneDimensionalControls
        fridge={fridge}
        config={config}
        updateConfig={updateConfig}
      />
    )
  }
}

// eslint-disable-next-line max-lines-per-function
function SweepConfig({ config, setConfig, sweep }: SweepConfigProps): ReactNode {
  const fridge = useFridge();
  const updateConfig = (update: Partial<SweepConfiguration>) => setConfig({ ...config, ...update });
  return (
    <div className="flex flex-col w-full p-2 gap-2">
      <SelectInput
        type="segmented"
        label="Sweep Dimensionality"
        options={["1D Sweep", "2D Sweep"]}
        value={config.isTwoDimensional ? "2D Sweep" : "1D Sweep"}
        onChange={(value) => updateConfig({ isTwoDimensional: value === "2D Sweep" })}
        rounded
        shadow
      />
      <DimensionalControls
        fridge={fridge}
        config={config}
        updateConfig={updateConfig}
      />
      <button
        className="w-full p-2 text-white bg-red-600 rounded-lg"
        onClick={sweep}
      >
        Run Sweep
      </button>
    </div>
  )
}

export type GraphConfiguration1D = {
  showColumns: [boolean, boolean];
  showStages: boolean[];
  showNoiseRow: boolean;
  showLines: boolean[][][];
  showTotalLines: boolean[];
  noiseCont: boolean[];
  noiseType: number;
  scaleLin: boolean[];
}

type GraphConfig1DProps = {
  config: GraphConfiguration1D,
  colours: { line: string[], noise: string[] },
  setConfig: (config: GraphConfiguration1D) => void
}

// eslint-disable-next-line max-lines-per-function
function GraphConfig1D({ config, colours, setConfig }: GraphConfig1DProps): ReactNode {
  const { stages, lines } = useFridge();
  const updateConfig = (update: Partial<GraphConfiguration1D>) => setConfig({ ...config, ...update });
  const yScaleLinear = config.scaleLin[0];
  const xScaleLinear = config.scaleLin[1];
  return (
    <div className="flex flex-col w-full p-2 gap-2">
      <MultipleSelectionInput
        label="Display Graphs"
        options={["Heat Load", "Temperature"]}
        selected={config.showColumns}
        onClick={(_, index) => updateConfig({ showColumns: config.showColumns.toSpliced(index, 1, !config.showColumns[index]) as [boolean, boolean] })}
        rounded
        shadow
      />
      <SelectInput
        type="dropdown"
        label="X-Axis Scale"
        options={["Linear", "Logarithmic"]}
        value={xScaleLinear ? "Linear" : "Logarithmic"}
        onChange={(value) => updateConfig({ scaleLin: [yScaleLinear, value === "Linear"] })}
        rounded
        shadow
      />
      <SelectInput
        type="dropdown"
        label="Y-Axis Scale"
        options={["Linear", "Logarithmic"]}
        value={yScaleLinear ? "Linear" : "Logarithmic"}
        onChange={(value) => updateConfig({ scaleLin: [value === "Linear", xScaleLinear] })}
        rounded
        shadow
      />
      {stages.map((stage, i) =>
        <div className={"flex flex-row items-center w-full"} key={i}>
          <GraphDisplayTable
            stage={stage.id}
            lines={lines}
            colours={colours.line}
            graphID={i}
            config={config}
            setConfig={setConfig}
          />
        </div>
      )}
      <NoiseDisplayTable
        stages={stages.map(s => s.id)}
        colours={colours.noise}
        config={config}
        setConfig={setConfig}
      />
    </div>
  );
}

export type GraphContour = {
  level: number,
  colour: string
}

export type GraphType2D = {
  type: ('Heat Load' | 'Temperature' | 'Noise'),
  target: string,
}

export type GraphConfiguration2D = {
  target: GraphType2D,
  colour: (t: number) => string,
  contours: GraphContour[],
  scale: [number, number] | "auto",
}

export type Add2DGraphModal = {
  modal: {
    active: boolean,
    graph: GraphConfiguration2D
  },
  setModal: React.Dispatch<React.SetStateAction<{
    active: boolean,
    graph: GraphConfiguration2D
  }>>
}

export type GraphConfig2DProps = {
  configs: GraphConfiguration2D[],
  setConfigs: (configs: GraphConfiguration2D[]) => void,
  modal: Add2DGraphModal,
}

// eslint-disable-next-line max-lines-per-function
function GraphConfig2D({ configs, setConfigs, modal }: GraphConfig2DProps): ReactNode {
  const { stages } = useFridge();
  const stageNames = stages.map(s => s.id);

  return (
    <div className="flex flex-col w-full p-2 gap-2">
      {configs.map((c, i) =>
        <GraphControl2D
          key={`graph-control-${i}`}
          stages={stageNames}
          config={c}
          setConfig={(config: GraphConfiguration2D) => setConfigs(configs.toSpliced(i, 1, config))}
          deleteConfig={() => setConfigs(configs.toSpliced(i, 1))}
        />
      )}
      <button
        className="w-full p-2 text-white bg-red-600 rounded-lg"
        onClick={() => modal.setModal({
          active: true,
          graph: {
            target: {
              type: 'Heat Load',
              target: stageNames[0]
            },
            colour: interpolatePlasma,
            contours: [],
            scale: "auto"
          }
        })}
      >
        Add Graph
      </button>
    </div>
  );
}

type SweepResult = [SweepDataObject | null, string | null];
type SweepResult2D = [SweepResults2D | null, string | null];

// eslint-disable-next-line max-lines-per-function
function useSweep(
  config: SweepConfiguration,
  twoDGraphConfigs: GraphConfiguration2D[],
  set2DGraphConfigs: (configs: GraphConfiguration2D[]) => void
): [SweepResult, SweepResult2D, () => void, () => void] {
  const model = useCryogenicModel();
  const fridge = useFridge();

  model.loadTemperatureEstimation(fridge.temperatureEstimationData);

  const [result1D, setResult1D] = useState<SweepResult>([null, "loading"]);
  const [result2D, setResult2D] = useState<SweepResult2D>([null, "loading"]);

  // eslint-disable-next-line max-lines-per-function
  function sweep1D(model: CryoModel, fridge: FridgeConfig, config: SweepConfiguration): SweepResult {
    const { ready, reason } = model.getStatus();
    if (!ready) return [null, reason];

    try {
      const data = evalSweepData(model, fridge, config);
      return [data, null];
    } catch (err: any) {
      return [null, err.toString()];
    }
  }

  // eslint-disable-next-line max-lines-per-function
  function sweep2D(model: CryoModel, fridge: FridgeConfig, config: SweepConfiguration): SweepResult2D {
    const { ready, reason } = model.getStatus();
    if (!ready) return [null, reason];

    try {
      const data = sweepModel2D(
        model,
        fridge,
        config.lineID2d,
        {
          xStart: config.xStart,
          xEnd: config.xEnd,
          xPoints: config.xPoints
        },
        {
          yStart: config.yStart,
          yEnd: config.yEnd,
          yPoints: config.yPoints
        },
        config.constraints2d
      );
      if (twoDGraphConfigs.length == 0) {
        // get stages that vary based on x and y 
        const varyingStages: string[] = fridge.stages.map((s) => s.id).filter((s, i) => {
          if (
            config.constraints2d[i].includes('x') ||
            config.constraints2d[i].includes('y')
          ) return true;
          else return false;
        })
        // generate default graphs
        const gConf: GraphConfiguration2D[] = [];
        // for each varying stage
        varyingStages.forEach((vStage) => {
          gConf.push({
            target: { type: 'Heat Load', target: vStage },
            colour: interpolatePlasma,
            contours: [],
            scale: "auto",
          });
          gConf.push({
            target: { type: 'Temperature', target: vStage },
            colour: interpolatePlasma,
            contours: [],
            scale: "auto",
          });
        });
        // for noise
        gConf.push({
          target: { type: 'Noise', target: 'Photons' },
          colour: interpolateViridis,
          contours: [],
          scale: "auto",
        })
        // set default 2D graphs
        set2DGraphConfigs(gConf);
      }
      return [data, null];
    } catch (err: any) {
      return [null, err.toString()];
    }
  }

  function run1DSweep() {
    // Check if the constraints are valid
    if (!model.isReady()) return; // Don't run the sweep if the model isn't ready

    const [invalid, reason] = checkConstraint(model, config.constraints, config.start, config.end, config.points);

    if (!config.isSamplingLinear && config.start <= 0 && config.end >= 0) {
      window.alert("Logarithmic sweep must not have 0 within it's bounds.");
      return;
    }

    if (invalid) {
      window.alert(reason);
      return;
    }

    setResult1D(sweep1D(model, fridge, config));
  }

  function run2DSweep() {
    // Check if the constraints are valid
    if (!model.isReady()) return; // Don't run the sweep if the model isn't ready

    const [invalid, reason] = checkConstraint(model, config.constraints, config.start, config.end, config.points);

    if (!config.isSamplingLinear && config.start <= 0 && config.end >= 0) {
      window.alert("Logarithmic sweep must not have 0 within it's bounds.");
      return;
    }

    if (invalid) {
      window.alert(reason);
      return;
    }

    setResult2D(sweep2D(model, fridge, config));
  }

  return [result1D, result2D, run1DSweep, run2DSweep];
}

function checkConstraint(model: CryoModelInterface, constraints: string[], start: number, end: number, points: number): [boolean, string] {
  const range = linspace(start, end, points);
  try {
    const config = model.constraintGeneration(constraints, range);
    const anyNegative = config.some(x => x.some(y => y < 0));
    if (anyNegative) return [true, 'Constraints result in a negative value for range.'];
    else return [false, ''];
  } catch (error) {
    const err = String(error);
    return [true, err]
  }
}

// eslint-disable-next-line max-lines-per-function
function useSweepConfig(): [SweepConfiguration, (config: SweepConfiguration) => void] {
  const fridge = useFridge();

  if (fridge.lines.length === 0) throw new Error("Unable to set sweep config as there are no lines in the fridge configuration.")
  if (fridge.stages.length === 0) throw new Error("Unable to set sweep config as there are no stages in the fridge configuration.")

  const [config, setConfig] = useState<SweepConfiguration>({
    isTwoDimensional: false,
    lineID: fridge.lines[1].id, // Default to drive, as flux and output are experiencing issues
    stageID: fridge.stages[0].id, // Default to the first stage
    start: 0,
    end: 60,
    points: 10,
    isSamplingLinear: true,
    constraints: fridge.stages.map((s, i) => i == 0 ? 'x' : '0'),
    //default 2D sweep to test data set, for now
    lineID2d: fridge.lines[1].id,
    xStageID: fridge.stages[4].id,
    xStart: 0,
    xEnd: 60,
    xPoints: 11,
    yStageID: fridge.stages[3].id,
    yStart: 0,
    yEnd: 60,
    yPoints: 11,
    constraints2d: ['0', '60 - x - y', '0', 'y', 'x']
  });

  // Force the constraints to be 'x' for the selected stage
  // eslint-disable-next-line max-lines-per-function
  useEffect(() => {
    for (let i = 0; i < fridge.stages.length; i++) {
      if (config.stageID === fridge.stages[i].id && config.constraints[i] !== 'x') {
        const newConstraints = config.constraints.toSpliced(i, 1, 'x');
        setConfig(config => ({ ...config, constraints: newConstraints }));
      }
      // need to add checks that both 'x' and 'y' for 2d sweeps are not on the same stage
      if (config.xStageID === fridge.stages[i].id && config.yStageID === fridge.stages[i].id) {
        const newConstraints = config.constraints2d.toSpliced(i, 1, 'x + y');
        setConfig(config => ({ ...config, constraints2d: newConstraints }));
      } else {
        // force constraint to be 'x' for selected stage of the 2 dimensional sweep
        if (config.xStageID === fridge.stages[i].id && config.constraints2d[i] !== 'x') {
          const newConstraints = config.constraints2d.toSpliced(i, 1, 'x');
          setConfig(config => ({ ...config, constraints2d: newConstraints }));
        }
        // force constraint to be 'y' for selected stage of the 2 dimensional sweep
        if (config.yStageID === fridge.stages[i].id && config.constraints2d[i] !== 'y') {
          const newConstraints = config.constraints2d.toSpliced(i, 1, 'y');
          setConfig(config => ({ ...config, constraints2d: newConstraints }));
        }
      }
    }
  }, [config, fridge.stages]);

  // If lineID or stageID change to invalid values, throw an error
  useEffect(() => {
    if (!fridge.lines.some(({ id }) => id === config.lineID)) throw new Error(`Invalid lineID in sweep config: ${config.lineID}`);
    if (!fridge.stages.some(({ id }) => id === config.stageID)) throw new Error(`Invalid stageID in sweep config: ${config.stageID}`);
  }, [config, fridge.lines, fridge.stages]);

  return [config, setConfig];
}

function use1DGraphConfig(fridge: FridgeContext): [GraphConfiguration1D, (config: GraphConfiguration1D) => void] {
  const lines = fridge.lines;
  const stages = fridge.stages.map(s => s.id);
  const nStages = ['RT', ...stages, 'Total']
  const [config, setConfig] = useState<GraphConfiguration1D>({
    showColumns: [true, true],
    showStages: stages.map((x, i) => true),
    showNoiseRow: true,
    showLines: stages.map(() => lines.map(() => [true, true, true])),
    showTotalLines: stages.map((x, i) => true),
    noiseCont: nStages.map((x, i) => true),
    noiseType: 0,
    scaleLin: [true, false]
  });
  return [config, setConfig];
}

// eslint-disable-next-line max-lines-per-function
function use2DGraphConfigs(): [GraphConfiguration2D[], (configs: GraphConfiguration2D[]) => void] {
  const [configs, setConfigs] = useState<GraphConfiguration2D[]>([]);
  return [configs, setConfigs]
}

// eslint-disable-next-line max-lines-per-function
export default function SweepPage() {
  const fridge = useFridge();
  const lines = fridge.lines;
  const stages = fridge.stages.map(s => s.id);
  const lineSignalTypes: ("Drive" | "Flux" | "Output")[] = lines.map(({ signalType }) => signalType);

  const [ref, dimensions] = useDimensions<HTMLDivElement>();

  const [sidebarTab, setSidebarTab] = useState("Configure Sweep");
  const [sweepConfig, setSweepConfig] = useSweepConfig();

  const [oneDGraphConfig, setOneDGraphConfig] = use1DGraphConfig(fridge);
  const [twoDGraphConfig, setTwoDGraphConfig] = use2DGraphConfigs();

  const horSegments = useMemo(() => {
    var result = 0;
    if (oneDGraphConfig.showColumns[0]) result++;
    if (oneDGraphConfig.showColumns[1]) result++;
    return result;
  }, [oneDGraphConfig.showColumns]);

  const verSegments = useMemo(() => {
    let result = 0;
    for (var stage in oneDGraphConfig.showStages) {
      if (oneDGraphConfig.showStages[stage]) result++;
    }
    if (oneDGraphConfig.showNoiseRow) result++;
    return result;
  }, [oneDGraphConfig.showStages, oneDGraphConfig.showNoiseRow]);

  const graphSize2D = Math.min(dimensions.height / 2, dimensions.width / 2);

  const [result1D, result2D, run1DSweep, run2DSweep] = useSweep(sweepConfig, twoDGraphConfig, setTwoDGraphConfig);
  const [sweepData1D, sweepData1DErr] = result1D;
  const [sweepData2D, sweepData2DErr] = result2D;

  const [modal1D, setModal1D] = useState<React.JSX.Element | null>(null);
  const [modal2D, setModal2D] = useState<React.JSX.Element | null>(null);

  const [add2DGraphModal, setAdd2DGraphModal] = useState<{ active: boolean, graph: GraphConfiguration2D }>({
    active: false,
    graph: {
      target: {
        type: 'Heat Load',
        target: stages[0]
      },
      colour: interpolatePlasma,
      contours: [],
      scale: "auto"
    }
  })

  return (
    <div ref={ref} className="flex flex-row justify-center items-center w-full h-full">
      <Modal
        showModal={add2DGraphModal.active}
        closeModal={() => setAdd2DGraphModal({
          active: false,
          graph: {
            target: {
              type: 'Heat Load',
              target: stages[0]
            },
            colour: interpolatePlasma,
            contours: [],
            scale: "auto"
          }
        })}
        innerStyle='flex flex-col p-8 bg-gray-400 rounded-2xl'
        outerWidth={dimensions.width}
        outerHeight={dimensions.height}
      >
        <h1 className={'px-16 text-center font-bold'}>Add 2D Sweep Graph</h1>
        <ModalGraphControl2D
          modalState={{ modal: add2DGraphModal, setModal: setAdd2DGraphModal }}
          stages={stages}
        />
        <button
          className="w-full p-2 text-white bg-red-600 rounded-lg"
          onClick={() => {
            setTwoDGraphConfig(twoDGraphConfig.concat(add2DGraphModal.graph))
            setAdd2DGraphModal({
              active: false,
              graph: {
                target: {
                  type: 'Heat Load',
                  target: stages[0]
                },
                colour: interpolatePlasma,
                contours: [],
                scale: "auto"
              }
            })
          }}
        >Add</button>
      </Modal>
      <SideBarContent>
        <SelectInput
          type="segmented"
          label=""
          options={["Configure Sweep", "Configure Graph"]}
          value={sidebarTab}
          onChange={setSidebarTab}
        />
        {sidebarTab === "Configure Sweep" && (
          <SweepConfig
            config={sweepConfig}
            setConfig={setSweepConfig}
            sweep={sweepConfig.isTwoDimensional ? run2DSweep : run1DSweep}
          />
        )}
        {sidebarTab === "Configure Graph" && !sweepConfig.isTwoDimensional && (
          (!sweepData1DErr) ?
            <GraphConfig1D
              config={oneDGraphConfig}
              colours={sweepData1D ? sweepData1D.colours : { line: [], noise: [] }}
              setConfig={setOneDGraphConfig}
            /> : <p className="text-center justify-center cursor-pointer" onClick={run1DSweep}>
              <span className="text-lg">Run a 1D Sweep to View Configuration Options</span>
              <br />
              <span className="text-md text-gray-500">Click to run the sweep</span>
            </p>
        )}
        {sidebarTab === "Configure Graph" && sweepConfig.isTwoDimensional && (
          (!sweepData2DErr) ?
            <GraphConfig2D
              configs={twoDGraphConfig}
              setConfigs={setTwoDGraphConfig}
              modal={{ modal: add2DGraphModal, setModal: setAdd2DGraphModal }}
            /> : <p className="text-center justify-center cursor-pointer" onClick={run2DSweep}>
              <span className="text-lg">Run a 2D Sweep to View Configuration Options</span>
              <br />
              <span className="text-md text-gray-500">Click to run the sweep</span>
            </p>

        )}
      </SideBarContent>
      {!sweepConfig.isTwoDimensional && sweepData1DErr && sweepData1DErr !== "loading" && (
        <div className="flex flex-col justify-around items-center w-full h-full">
          <p>
            <span className="text-3xl font-bold">Error Running 1D Sweep</span>
            <br />
            <span className="block text-red-800 whitespace-pre-wrap">{sweepData1DErr.toString()}</span>
          </p>
        </div>
      )}
      {sweepConfig.isTwoDimensional && sweepData2DErr && sweepData2DErr !== "loading" && (
        <div className="flex flex-col justify-around items-center w-full h-full">
          <p>
            <span className="text-3xl font-bold">Error Running 2D Sweep</span>
            <br />
            <span className="block text-red-800 whitespace-pre-wrap">{sweepData2DErr.toString()}</span>
          </p>
        </div>
      )}
      {(
        (sweepData1DErr === "loading" && !sweepConfig.isTwoDimensional) ||
        ((sweepData2DErr === "loading") && sweepConfig.isTwoDimensional)
      ) && (
          <div
            className="flex flex-col justify-around items-center w-full h-full cursor-pointer"
            onClick={(sweepConfig.isTwoDimensional) ? run2DSweep : run1DSweep}
          >
            <p>
              <span className="text-3xl font-bold">
                No {(sweepConfig.isTwoDimensional) ? '2D' : '1D'} Sweep Results Yet
              </span>
              <br />
              <span className="text-lg text-gray-500">Click to run the sweep</span>
            </p>
          </div>
        )}
      {!sweepData1DErr && !sweepConfig.isTwoDimensional && modal1D == null && sweepData1D != null &&
        <OneDSweepGraphs
          sweepData={sweepData1D}
          oneDGraphConfig={oneDGraphConfig}
          lineSignalTypes={lineSignalTypes}
          noiseTypes={noiseTypes}
          filterLines={filterLines}
          setModal={setModal1D}
          sweepVariable={sweepConfig.stageID}
        />
      }
      {!sweepData1DErr && !sweepConfig.isTwoDimensional && modal1D != null &&
        <div
          onClick={() => setModal1D(null)}
          className={
            (modal1D == null) ? "hidden" : "flex justify-center items-center cursor-zoom-out"
          }
          style={{ backgroundColor: "gainsboro" }}
        >
          {modal1D}
        </div>
      }
      {!sweepData2DErr && sweepData2D != null && sweepConfig.isTwoDimensional &&
        <div className={"flex flex-wrap w-full h-full overflow-y-scroll" + ((modal2D != null) ? " justify-center items-center" : "")} key={'2DLayout'} style={{ backgroundColor: "gainsboro" }}>
          {twoDGraphConfig.map((c, i) =>
            <div
              key={`twoD-graph-${i}`}
              className={(modal2D != null) ? "hidden" : "flex flex-wrap w-1/2 h-1/2"}
            >
              <ColourGraph
                data={get2DGraphValues(sweepData2D, c.target, stages)}
                size={graphSize2D}
                contourDefs={c.contours}
                scale={c.scale}
                colourInterpolator={c.colour}
                labels={{
                  x: sweepConfig.xStageID + ' Attenuation (dB)',
                  y: sweepConfig.yStageID + ' Attenuation (dB)'
                }}
                setModal={setModal2D}
              />
            </div>
          )}
          <div
            onClick={() => setModal2D(null)}
            className={
              (modal2D == null) ? "hidden" : "flex justify-center items-center cursor-zoom-out"
            }
          >
            {modal2D}
          </div>
        </div>
      }
    </div>
  )
}
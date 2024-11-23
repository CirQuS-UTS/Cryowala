"use client"

import { FC, useMemo, useState } from 'react';
import { Group } from '@visx/group';
import { hierarchy, Tree } from '@visx/hierarchy';
import { useFridge } from '@/components/config/context';
import { FridgeConfig, SegmentConfig } from '@/components/pyodide/fridge.d';
import { LinkVerticalStep } from '@visx/shape';
import { CryoModel, useCryogenicModel } from '@/components/pyodide';
import { cableAttenuation } from '@/components/pyodide/fridge';
import { getLineColour, getOrderedLineSegments, shortNumber, getSIUnits } from '@/components/wiremap/helpers';
import { NodeBox, NodeText } from '@/components/wiremap/nodeComponents';
import { useDimensions } from '@/components/wiremap/wrapper';
import Number from '@/components/inputs/single_value/number';
import Modal from '../inputs/modal';
import { LoadingScreen } from '@/components/loadingScreen';
import { WithPythonRuntime } from '@/lib/pythonrt';

type TreeNodeRender = FC<{ width: number; height: number }>;
interface TreeNode {
  render: TreeNodeRender;
  getLinkColour: () => string;
  getChildren: () => TreeNode[];
}

function getSegmentNode(
  fridge: FridgeConfig,
  model: CryoModel,
  segment: SegmentConfig,
  wireDiagramModal: WireDiagramModal
): TreeNode {
  const lineSegments = getOrderedLineSegments(fridge, segment.lineId);
  const index = lineSegments.findIndex(lineSegment => lineSegment.stageId === segment.stageId);
  const nextSegment = lineSegments[index + 1];
  const children = nextSegment ? [getSegmentNode(fridge, model, nextSegment, wireDiagramModal)] : [getAttenuationTotalNode(fridge, model, segment.lineId)];
  const nextLineColour = nextSegment ? getLineColour(fridge, nextSegment.cableId) : 'none'

  return {
    render: ({ width, height }) => (<Segment segment={segment} width={width} height={height} wireDiagramModal={wireDiagramModal} />),
    getLinkColour: () => nextLineColour,
    getChildren: () => children
  };
}

// eslint-disable-next-line max-lines-per-function
function getAttenuationTotalNode(
  fridge: FridgeConfig,
  model: CryoModel,
  lineId: string
): TreeNode {

  const lineSegments = getOrderedLineSegments(fridge, lineId);
  var attenuationTotal = 0;

  for (let i = 0; i < lineSegments.length; i++) {
    attenuationTotal += lineSegments[i].attenuation;
    try {
      attenuationTotal += cableAttenuation(model, fridge, lineSegments[i]) * lineSegments[i].length;
    } catch (e) {
      console.warn("could not calculate cable attenuation for line: " + lineId);
    }
  }

  return {
    render: ({ width, height }) => (
      <Label width={width} height={height} lines={[`${shortNumber(attenuationTotal)}dB`]} />
    ),
    getLinkColour: () => 'none',
    getChildren: () => []
  };
}

// eslint-disable-next-line max-lines-per-function
function getStageNode(fridge: FridgeConfig, stageId: string): TreeNode {
  const index = fridge.stages.findIndex(stage => stage.id === stageId);
  const stage = fridge.stages.find(stage => stage.id === stageId);
  const nextStage = fridge.stages[index + 1];
  const children = nextStage ? [getStageNode(fridge, nextStage.id)] : [getAttenuationTotalLabelNode()];

  return {
    render: ({ width, height }) => (<>
      <Label
        width={width} height={height} bold
        lines={[
          `'${stageId}'`,
          `${getSIUnits(stage?.temperature, 'K')}`,
          `${getSIUnits(stage?.coolingPower, 'W')}`
        ]}
      />
      <NodeBox
        width={width * (fridge.lines.length + 1)}
        height={height / 6}
        x={width / 2} y={height / 32}
        stroke="white" strokeWidth={2}
        fill="white" opacity={0.5}
        rx={0}
      />
    </>),
    getLinkColour: () => "none",
    getChildren: () => children
  };
}

function getAttenuationTotalLabelNode(): TreeNode {
  return {
    render: ({ width, height }) => (
      <Label width={width} height={height} lines={[`Total`, `Attenuation`]} bold />
    ),
    getLinkColour: () => "none",
    getChildren: () => []
  };
}

// eslint-disable-next-line max-lines-per-function
function buildTree(
  fridge: FridgeConfig,
  model: CryoModel,
  wireDiagramModal: WireDiagramModal
): TreeNode {

  const lineRoots: TreeNode[] = fridge.lines.map(line => {
    const segment = getOrderedLineSegments(fridge, line.id)[0];
    return {
      render: ({ width, height }) => (<Label width={width} height={height} lines={[`'${line.id}'`, `${line.count} lines`, `${(line.currentType == 'AC') ? line.signalFrequency + 'GHz' : line.currentType}`]} bold />),
      getLinkColour: () => getLineColour(fridge, segment.cableId),
      getChildren: () => [getSegmentNode(fridge, model, segment, wireDiagramModal)],
    };
  });

  const stageRoot: TreeNode = {
    render: ({ width, height }) => (<Label width={width} height={height} lines={["Stage"]} bold />),
    getLinkColour: () => "none",
    getChildren: () => [getStageNode(fridge, fridge.stages[0]?.id)],
  };

  const root: TreeNode = {
    render: ({ width, height }) => (
      <>
        <Label width={width} height={height} lines={["Fridge"]} bold />
        <text
          fill="white"
          x={(width / 1.5) * 1.2}
          y={-height / 8}
        >Cable Legend</text>
        {fridge.cables.map((cable, i) =>
          <NodeBox
            key={cable.id}
            width={height / 4} height={height / 4}
            x={(width / 1.5) + ((height / 4) * (i + 1) * 1.2)} y={height / 16}
            stroke="black" fill={getLineColour(fridge, cable.id)}
            title={'Cable Type: ' + cable.id}
          />
        )}
      </>
    ),
    getLinkColour: () => "none",
    getChildren: () => [stageRoot, ...lineRoots],
  };

  return root;
}

type SegmentProps = {
  segment: SegmentConfig;
  width: number;
  height: number;
  wireDiagramModal: WireDiagramModal;
}
// eslint-disable-next-line max-lines-per-function
function Segment({ segment, width, height, wireDiagramModal }: SegmentProps) {
  const model = useCryogenicModel();
  const fridge = useFridge();

  const cableAtt = useMemo(() => {
    try {
      return cableAttenuation(model, fridge, segment) * segment.length;
    } catch (e) {
      return NaN
    }
  }, [model, fridge, segment]);

  const thermalisations = [segment.innerThermalisation, segment.dielectricThermalisation, segment.outerThermalisation];
  const shouldRender = thermalisations.some(thermalisation => thermalisation !== "auto") || segment.attenuation > 0;

  // eslint-disable-next-line max-lines-per-function
  const updateThermalisation = (segment: SegmentConfig, thermalID: ("inner" | "dielectric" | "outer")) => {
    const updatedSegmentID = fridge.segments.findIndex((seg) => seg.lineId == segment.lineId && seg.stageId == segment.stageId)
    const updatingThermalisations = (config: "auto" | "on" | "off") => {
      if (config == "on") return "auto"
      else if (config == "auto") return "off"
      else return "on"
    }
    const updatedSegment: SegmentConfig = {
      cableId: segment.cableId,
      lineId: segment.lineId,
      stageId: segment.stageId,
      attenuation: segment.attenuation,
      length: segment.length,
      innerThermalisation: (thermalID == "inner")
        ? updatingThermalisations(segment.innerThermalisation)
        : segment.innerThermalisation,
      dielectricThermalisation: (thermalID == "dielectric")
        ? updatingThermalisations(segment.dielectricThermalisation)
        : segment.dielectricThermalisation,
      outerThermalisation: (thermalID == "outer")
        ? updatingThermalisations(segment.outerThermalisation)
        : segment.outerThermalisation,
    }
    fridge.setSegments(fridge.segments.toSpliced(updatedSegmentID, 1, updatedSegment));
  }

  const updateAttenuation = (segment: SegmentConfig, newAtt: number) => {
    const updatedSegmentID = fridge.segments.findIndex((seg) => seg.lineId == segment.lineId && seg.stageId == segment.stageId)
    const updatedSegment: SegmentConfig = {
      cableId: segment.cableId,
      lineId: segment.lineId,
      stageId: segment.stageId,
      attenuation: newAtt,
      length: segment.length,
      innerThermalisation: segment.innerThermalisation,
      dielectricThermalisation: segment.dielectricThermalisation,
      outerThermalisation: segment.outerThermalisation,
    }
    fridge.setSegments(fridge.segments.toSpliced(updatedSegmentID, 1, updatedSegment));
  }

  function getThermalisationColour(state: "auto" | "on" | "off") {
    if (state == 'on') return 'green'
    else if (state == 'off') return 'red'
    else return 'yellow'
  }

  return (
    <>
      {shouldRender && (<>
        <NodeBox
          width={width / 3}
          height={height}
          stroke="black"
          strokeWidth={2}
          fill="white"
          rx={0}
        />
        <NodeText
          colour="black"
          lines={[`${shortNumber(segment.attenuation)}dB`]}
          transform='rotate(-90)'
          onClick={() => wireDiagramModal.setModal({
            active: true,
            name: `${segment.lineId} ${segment.stageId} Attenuation`,
            value: segment.attenuation,
            onSubmit: (newAtt: number) => updateAttenuation(segment, newAtt)
          })}
          className='cursor-pointer'
          fontWeight={400}
        />
      </>)}
      <NodeBox
        width={width / 8}
        height={height / 4}
        x={(shouldRender) ? (width / 4) : (-width / 8) * 1.5} y={-height / 8}
        stroke="black"
        fill={getThermalisationColour(segment.innerThermalisation)}
        onClick={() => updateThermalisation(segment, "inner")}
        className='cursor-pointer'
        title={'Inner Thermalisation: ' + segment.innerThermalisation.charAt(0).toUpperCase() + segment.innerThermalisation.slice(1)}
      />
      <NodeBox
        width={width / 8}
        height={height / 4}
        x={(shouldRender) ? (width / 4) + (width / 8) : (-width / 8) * 0.5} y={-height / 8}
        stroke="black"
        fill={getThermalisationColour(segment.dielectricThermalisation)}
        onClick={() => updateThermalisation(segment, "dielectric")}
        className='cursor-pointer'
        title={'Dielectric Thermalisation: ' + segment.dielectricThermalisation.charAt(0).toUpperCase() + segment.dielectricThermalisation.slice(1)}
      />
      <NodeBox
        width={width / 8}
        height={height / 4}
        x={(shouldRender) ? (width / 4) + ((width / 8) * 2) : (width / 8) * 0.5} y={-height / 8}
        stroke="black"
        fill={getThermalisationColour(segment.outerThermalisation)}
        onClick={() => updateThermalisation(segment, "outer")}
        className='cursor-pointer'
        title={'Outer Thermalisation: ' + segment.outerThermalisation.charAt(0).toUpperCase() + segment.outerThermalisation.slice(1)}
      />
      <text fill="white" textAnchor="left" fontSize="16"
        dy="0.5em" y={-height * 3 / 4} x="0.5em"
      >
        {shortNumber(cableAtt)}dB
      </text>
    </>
  )
}

type LabelProps = {
  lines: string[];
  width: number;
  height: number;
  bold?: boolean;
}
function Label({ lines, width, height, bold }: LabelProps) {
  return (
    <>
      <NodeBox width={width} height={height} fill="#082c6c" />
      <NodeText colour="white" lines={lines} fontWeight={(bold) ? 'bold' : 'normal'} />
    </>
  )
}

type WireDiagramModal = {
  modal: {
    active: boolean;
    name: string;
    value: number;
    onSubmit: (val: number) => void;
  },
  setModal: React.Dispatch<React.SetStateAction<{
    active: boolean;
    name: string;
    value: number;
    onSubmit: (val: number) => void;
  }>>
}

const defaultMargin = { top: 10, left: 30, right: 30, bottom: 30 };
export type WiringDiagramWrapperProps = {
  margin?: { top: number; right: number; bottom: number; left: number };
};
// eslint-disable-next-line max-lines-per-function
export default function WiringDiagramWrapper({ margin = defaultMargin }: WiringDiagramWrapperProps) {
  return (
    <WithPythonRuntime>
      <WiringDiagram margin={margin} />
    </WithPythonRuntime>
  );
}

export type WiringDiagramProps = {
  margin: { top: number; right: number; bottom: number; left: number };
};
// eslint-disable-next-line max-lines-per-function
export function WiringDiagram({ margin }: WiringDiagramProps) {
  const model = useCryogenicModel();
  const { width: totalWidth, height: totalHeight } = useDimensions();

  const width = totalWidth - margin.left - margin.right;
  const height = totalHeight - margin.top - margin.bottom;

  const LinkComponent = LinkVerticalStep;

  const fridge = useFridge();
  const treeBreadth = fridge.lines.length;
  const treeDepth = fridge.stages.length + 1;

  const freeVerticalSpacePercentage = 0.45;
  const freeHorizontalSpacePercentage = 0.3;
  const usedVerticalSpacePercentage = 1 - freeVerticalSpacePercentage;
  const usedHorizontalSpacePercentage = 1 - freeHorizontalSpacePercentage;

  const nodeWidth = (width * usedHorizontalSpacePercentage) / treeBreadth;
  const nodeHeight = (height * usedVerticalSpacePercentage) / treeDepth;

  const [wireDiagramModal, setWireDiagramModal] = useState<{
    active: boolean,
    name: string,
    value: number,
    onSubmit: (val: number) => void,
  }>({
    active: false,
    name: "",
    value: 0,
    onSubmit: (val: number) => { }
  });

  return (
    <>
      <Modal
        showModal={wireDiagramModal.active}
        closeModal={() => setWireDiagramModal({ active: false, name: '', value: 0, onSubmit: () => { } })}
        innerStyle='flex flex-col p-8 bg-gray-300 bg-white rounded-2xl'
        outerWidth={totalWidth}
        outerHeight={totalHeight}
      >
        <h1 className={'text-center font-bold'}>{wireDiagramModal.name}</h1>
        <br />
        <Number
          label="Attenuation"
          value={wireDiagramModal.value}
          onChange={(val) => setWireDiagramModal({
            active: wireDiagramModal.active,
            name: wireDiagramModal.name,
            value: val,
            onSubmit: wireDiagramModal.onSubmit
          })}
        />
        <div className='flex flex-row justify-around items-center'>
          <button
            className="w-full p-2 text-white bg-red-600"
            onClick={() => setWireDiagramModal({ active: false, name: '', value: 0, onSubmit: () => { } })}
          >
            Close
          </button>
          <button
            className="w-full p-2 text-white bg-blue-600"
            onClick={() => {
              wireDiagramModal.onSubmit(wireDiagramModal.value);
              setWireDiagramModal({ active: false, value: 0, name: '', onSubmit: () => { } })
            }}
          >
            Apply
          </button>
        </div>
      </Modal>
      <svg width={totalWidth} height={totalHeight}>
        <rect width={totalWidth} height={totalHeight} fill="#082c6c" />
        <Group top={margin.top + nodeHeight / 2} left={margin.left}>
          <Tree
            root={hierarchy(buildTree(fridge, model, { modal: wireDiagramModal, setModal: setWireDiagramModal }), (d) => d.getChildren())}
            size={[width, height - nodeHeight]}
            separation={(a, b) => (a.parent === b.parent ? 1 : 0) / a.depth}
          >
            {(tree) => (
              <Group key={`tree-${tree.id}`} top={0} left={0}>
                {tree.links().map((link, i) => (
                  <LinkComponent key={i} data={link}
                    percent={1} // Place the step halfway along the link
                    strokeWidth="2" stroke={link.source.data.getLinkColour()}
                    fill="none"
                  />
                ))}

                {tree.descendants().map((node, key) => {
                  const NodeDisplay = node.data.render;
                  return (
                    <Group top={node.y} left={node.x} key={key}>
                      <NodeDisplay width={nodeWidth} height={nodeHeight} />
                    </Group>
                  );
                })}
              </Group>
            )}
          </Tree>
        </Group>
      </svg>
    </>
  );
}
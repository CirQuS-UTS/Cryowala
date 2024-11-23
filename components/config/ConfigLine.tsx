"use client"

import { useMemo } from "react";
import { useFridge } from "@/components/config/context";
import { LineConfig, SegmentConfig, StageConfig } from "@/components/pyodide/fridge.d"
import { NumericInputColumn } from "@/components/inputs/numeric";
import { SelectColumn } from "@/components/inputs/select";
import { DeleteButtonColumn, FormGroup, FormSection, findNextId } from "@/components/config/common";
import { UniqueInputColumn } from "@/components/inputs/unique";

const signalTypes: string[] = ["Drive", "Flux", "Output"];
const currentTypes: string[] = ["AC", "DC"];

function getNewLine(lines: LineConfig[], stages: StageConfig[]): [LineConfig, SegmentConfig[]] {
  const line: LineConfig = {
    id: findNextId(lines, "New Line"),
    signalType: "Drive", currentType: "AC",
    signalPower: 0, signalFrequency: 0, inputCurrent: 0,
    count: 0
  };
  const segments: SegmentConfig[] = stages.map((stage) => ({
    lineId: line.id,
    stageId: stage.id,
    cableId: "Unknown Cable",
    innerThermalisation: "auto",
    dielectricThermalisation: "auto",
    outerThermalisation: "auto",
    length: 0, attenuation: 0
  }));

  return [line, segments];
}

type LineConfigProps = {
  tooltips: {
    title: string,
    line_name: string,
    signal_type: string,
    line_count: string,
    current_type: string,
    signal_power: string,
    signal_frequency: string,
    input_current: string,
    add_line: string,
    remove_line: string
  }
}

// eslint-disable-next-line max-lines-per-function
export default function FridgeLines({ tooltips }: LineConfigProps): JSX.Element {
  const { lines, setLines, stages, segments, setSegments } = useFridge();
  const updateLineId = (index: number, oldId: string, value: string) => {
    setSegments(segments.map((item: SegmentConfig) => item.lineId !== oldId ? item : { ...item, lineId: value }));
    updateLine(index, "id", value);
  }
  const updateLine = (index: number, field: string, value: any) => {
    setLines(lines.map((item: LineConfig, i: number) => i !== index ? item : { ...item, [field]: value }));
  };
  const addLine = () => {
    const [newLine, newSegments] = getNewLine(lines, stages);
    setLines([...lines, newLine]);
    setSegments([...segments, ...newSegments]);
  };
  const removeLine = useMemo(() => (index: number) => {
    const line = lines[index];
    setLines(lines.filter((item: LineConfig, i: number) => i !== index));
    setSegments(segments.filter((item: SegmentConfig) => item.lineId !== line.id));
  }, [lines, segments, setLines, setSegments]);


  return (
    <FormSection>
      <FormGroup title="Lines" tooltip={tooltips.title} buttonLabel="Add Line" buttonTooltip={tooltips.add_line} onAddClicked={addLine} >
        <UniqueInputColumn<LineConfig> label="Line Names" tooltip={tooltips.line_name} data={lines} valueGetter={(item: LineConfig) => item.id} valueSetter={(index, item, value) => updateLineId(index, item.id, value)} isUnique={(value: string) => lines.every((item: LineConfig) => item.id !== value)} />
        <SelectColumn<LineConfig> label="Signal Type" tooltip={tooltips.signal_type} data={lines} valueGetter={(item: LineConfig) => item.signalType} valueSetter={(index, item, value) => updateLine(index, "signalType", value)} options={signalTypes} />
        <NumericInputColumn<LineConfig> label="Line Count" tooltip={tooltips.line_count} data={lines} valueGetter={(item: LineConfig) => item.count} valueSetter={(index, item, value) => updateLine(index, "count", value)} />
        <SelectColumn<LineConfig> label="Current Type" tooltip={tooltips.current_type} data={lines} valueGetter={(item: LineConfig) => item.currentType} valueSetter={(index, item, value) => updateLine(index, "currentType", value)} options={currentTypes} />
        <NumericInputColumn<LineConfig> label="Signal Power" tooltip={tooltips.signal_power} data={lines} valueGetter={(item: LineConfig) => item.signalPower} valueSetter={(index, item, value) => updateLine(index, "signalPower", value)} propGenerator={(index: number, item: LineConfig) => ({ disabled: item.currentType !== "AC" })} />
        <NumericInputColumn<LineConfig> label="Signal Frequency" tooltip={tooltips.signal_frequency} data={lines} valueGetter={(item: LineConfig) => item.signalFrequency} valueSetter={(index, item, value) => updateLine(index, "signalFrequency", value)} propGenerator={(index: number, item: LineConfig) => ({ disabled: item.currentType !== "AC" })} />
        <NumericInputColumn<LineConfig> label="Input Current" tooltip={tooltips.input_current} data={lines} valueGetter={(item: LineConfig) => item.inputCurrent} valueSetter={(index, item, value) => updateLine(index, "inputCurrent", value)} propGenerator={(index: number, item: LineConfig) => ({ disabled: item.currentType !== "DC" })} />
        <DeleteButtonColumn<LineConfig> label="Line" data={lines} tooltip={tooltips.remove_line} onClick={removeLine} />
      </FormGroup>
    </FormSection>
  )
}

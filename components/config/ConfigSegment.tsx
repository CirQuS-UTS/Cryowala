import { useFridge } from "@/components/config/context";
import { CableConfig, LineConfig, SegmentConfig, StageConfig, Thermalisation, ThermalisationOptions } from "@/components/pyodide/fridge.d"
import { InputColumn } from "@/components/inputs/default";
import { SelectColumn } from "@/components/inputs/select";
import { NumericInputColumn } from "@/components/inputs/numeric";
import { FormGroup, FormSection } from "@/components/config/common";

type SegmentConfigProps = {
  tooltips: {
    cable_types: {
      title: string,
      stage: string,
      line: string
    },
    lengths: {
      title: string,
      stage: string,
      line: string
    },
    attenuations: {
      title: string,
      stage: string,
      line: string
    },
    line_thermalisation: {
      title: string,
      stage: string,
      inner: string,
      dielectric: string,
      outer: string
    }
  }
}

// eslint-disable-next-line max-lines-per-function
export default function FridgeSegments({ tooltips }: SegmentConfigProps): JSX.Element {
  const { segments, setSegments, stages, cables, lines } = useFridge();
  const updateSegment = (segment: SegmentConfig, field: string, value: any) => {
    setSegments(segments.map((item: SegmentConfig) => item.lineId !== segment.lineId || item.stageId !== segment.stageId ? item : { ...item, [field]: value }));
  };

  const getStage = (stageId: string) => {
    const stage = stages.find((stage: StageConfig) => stage.id === stageId);
    if (!stage) throw new Error(`Stage ${stageId} not found`);
    return stage;
  }
  const filterSegmentsByLine = (lineId: string) => {
    const lineSegments = segments.filter((segment: SegmentConfig) => segment.lineId === lineId);
    lineSegments.sort((a, b) => getStage(a.stageId).index - getStage(b.stageId).index);
    return lineSegments;
  }

  return (
    <FormSection>
      <FormGroup title="Cable Segment Types" tooltip={tooltips.cable_types.title} >
        <InputColumn<StageConfig> label="Stage Below Cable" tooltip={tooltips.cable_types.stage} data={stages} valueGetter={(item: StageConfig) => item.id} valueSetter={() => undefined} disabled={true} />
        {lines.map((line: LineConfig) => (
          <SelectColumn<SegmentConfig> key={`segment-${line.id}`} label={`Line: ${line.id}`} tooltip={tooltips.cable_types.line} data={filterSegmentsByLine(line.id)} valueGetter={(item: SegmentConfig) => item.cableId} valueSetter={(index, item, value) => updateSegment(item, "cableId", value)} options={cables.map((cable: CableConfig) => cable.id)} />
        ))}
      </FormGroup>

      <FormGroup title="Segment Lengths" tooltip={tooltips.lengths.title} >
        <InputColumn<StageConfig> label="Stage" tooltip={tooltips.lengths.stage} data={stages} valueGetter={(item: StageConfig) => item.id} valueSetter={() => undefined} disabled={true} />
        {lines.map((line: LineConfig) => (
          <NumericInputColumn<SegmentConfig> key={`segment-${line.id}`} label={`Line: ${line.id}`} tooltip={tooltips.lengths.line} data={filterSegmentsByLine(line.id)} valueGetter={(item: SegmentConfig) => item.length} valueSetter={(index, item, value) => updateSegment(item, "length", value)} />
        ))}
      </FormGroup>

      <FormGroup title="Attenuation" tooltip={tooltips.attenuations.title} >
        <InputColumn<StageConfig> label="Stage" tooltip={tooltips.attenuations.stage} data={stages} valueGetter={(item: StageConfig) => item.id} valueSetter={() => undefined} disabled={true} />
        {lines.map((line: LineConfig) => (
          <NumericInputColumn<SegmentConfig> key={`segment-${line.id}`} label={`Line: ${line.id}`} tooltip={tooltips.attenuations.line} data={filterSegmentsByLine(line.id)} valueGetter={(item: SegmentConfig) => item.attenuation} valueSetter={(index, item, value) => updateSegment(item, "attenuation", value)} />
        ))}
      </FormGroup>

      {lines.map((line: LineConfig) => (
        <FormGroup key={`segments-${line.id}`} title={`Line Thermalisation: ${line.id}`} tooltip={tooltips.line_thermalisation.title} >
          <InputColumn<StageConfig> label="Stage" tooltip={tooltips.line_thermalisation.stage} data={stages} valueGetter={(item: StageConfig) => item.id} valueSetter={() => undefined} disabled={true} />
          <SelectColumn<SegmentConfig> label="Inner Thermalisation" tooltip={tooltips.line_thermalisation.inner} data={filterSegmentsByLine(line.id)} valueGetter={(item: SegmentConfig) => item.innerThermalisation} valueSetter={(index, item, value) => updateSegment(item, "innerThermalisation", value)} options={[...ThermalisationOptions]} />
          <SelectColumn<SegmentConfig> label="Dielectric Thermalisation" tooltip={tooltips.line_thermalisation.dielectric} data={filterSegmentsByLine(line.id)} valueGetter={(item: SegmentConfig) => item.dielectricThermalisation} valueSetter={(index, item, value) => updateSegment(item, "dielectricThermalisation", value)} options={[...ThermalisationOptions]} />
          <SelectColumn<SegmentConfig> label="Outer Thermalisation" tooltip={tooltips.line_thermalisation.outer} data={filterSegmentsByLine(line.id)} valueGetter={(item: SegmentConfig) => item.outerThermalisation} valueSetter={(index, item, value) => updateSegment(item, "outerThermalisation", value)} options={[...ThermalisationOptions]} />
        </FormGroup>
      ))}

    </FormSection>
  );
}

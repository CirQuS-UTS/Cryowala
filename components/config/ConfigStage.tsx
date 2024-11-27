"use client"

import { useFridge } from "@/components/config/context";
import { LineConfig, SegmentConfig, StageConfig } from "@/components/pyodide/fridge.d"
import { UniqueInputColumn } from "@/components/inputs/unique";
import { NumericInputColumn } from "@/components/inputs/numeric";
import { DeleteButtonColumn, FormGroup, FormSection, findNextId } from "@/components/config/common";
import { ButtonColumn, UploadButtonColumn } from "@/components/inputs/button";
import { readCSVFile } from "@/components/config/ConfigCable";
import { useFeatureFlags } from "@/components/config/featureFlagContext";

function getNewStage(stages: StageConfig[], lines: LineConfig[]): [StageConfig, SegmentConfig[]] {
  const nextIndex = stages.length > 0 ? Math.ceil(Math.max(...stages.map((item: StageConfig) => item.index))) + 1 : 0;

  const newStage: StageConfig = {
    id: findNextId(stages, "New Stage"), index: nextIndex,
    temperature: 0, coolingPower: 0
  };
  const newSegments: SegmentConfig[] = lines.map((line) => ({
    lineId: line.id,
    stageId: newStage.id,
    cableId: "Unknown Cable",
    innerThermalisation: "auto",
    dielectricThermalisation: "auto",
    outerThermalisation: "auto",
    length: 0, attenuation: 0
  }));

  return [newStage, newSegments];
}

type StageConfigProps = {
  tooltips: {
    title: string,
    index: string,
    stage_names: string,
    tempertures: string,
    cooling_powers: string,
    add_stage: string,
    remove_stage: string
  },
  setModal: React.Dispatch<React.SetStateAction<{
    active: boolean;
    data: string;
    onSubmit: (dataStr: string) => void;
  }>>
}

// eslint-disable-next-line max-lines-per-function
export default function FridgeStages({ tooltips, setModal }: StageConfigProps): JSX.Element {
  const { stages, setStages, lines, segments, setSegments } = useFridge();
  const updateStageId = (index: number, oldId: string, value: string) => {
    setSegments(segments.map((item: SegmentConfig) => item.stageId !== oldId ? item : { ...item, stageId: value }));
    updateStage(index, "id", value);
  }
  const updateStage = (index: number, field: string, value: any) => {
    setStages(stages.map((item: StageConfig, i: number) => i !== index ? item : { ...item, [field]: value }));
  };
  const addStage = () => {
    const [newStage, newSegments] = getNewStage(stages, lines);
    setStages([...stages, newStage]);
    setSegments([...segments, ...newSegments]);
  };
  const removeStage = (index: number) => {
    const stage = stages[index];
    setStages(stages.filter((item: StageConfig, i: number) => i !== index));
    setSegments(segments.filter((item: SegmentConfig) => item.stageId !== stage.id));
  };

  // eslint-disable-next-line max-lines-per-function
  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = event.target.files;
    if (!files) return alert("No file selected");
    if (files.length !== 1) return alert("Please select exactly one file");

    //apply data from file to appropriate function/storage
    files[0].text().then(
      (text) => {
        try {
          const dataString = dataToString(interpretTempEstimatePoints(readCSVFile(text)));
          setModal({
            active: true,
            data: dataString,
            onSubmit: (dataStr: string) => {
              console.log(fromStringToArray(dataStr));
            }
          })
        } catch (err) {
          alert(err);
          console.log(err);
        }
      }
    );
  }

  const featureFlags = useFeatureFlags()

  return (
    <FormSection>
      <FormGroup title="Stages" tooltip={tooltips.title} buttonLabel="Add Stage" buttonTooltip={tooltips.add_stage} onAddClicked={(featureFlags.staticStageCount) ? undefined : addStage} >
        <NumericInputColumn<StageConfig> label="Index" tooltip={tooltips.index} data={stages} valueGetter={(item: StageConfig) => item.index} valueSetter={(index, item, value) => updateStage(index, "index", value)} />
        <UniqueInputColumn<StageConfig> label="Stage Names" tooltip={tooltips.stage_names} data={stages} valueGetter={(item: StageConfig) => item.id} valueSetter={(index, item, value) => updateStageId(index, item.id, value)} isUnique={(value: string) => stages.every((item: StageConfig) => item.id !== value)} />
        <NumericInputColumn<StageConfig> label="Temperatures" tooltip={tooltips.tempertures} data={stages} valueGetter={(item: StageConfig) => item.temperature} valueSetter={(index, item, value) => updateStage(index, "temperature", value)} />
        <NumericInputColumn<StageConfig> label="Cooling Powers" tooltip={tooltips.cooling_powers} data={stages} valueGetter={(item: StageConfig) => item.coolingPower} valueSetter={(index, item, value) => updateStage(index, "coolingPower", value)} />

        <UploadButtonColumn<StageConfig>
          label={"Load Temperature Data"}
          message={"Import CSV File"}
          data={stages}
          onClick={onFileSelected}
        />
        <ButtonColumn<StageConfig>
          label={'View Temperature Data'}
          message="View Data Points"
          data={stages}
          onClick={() => null}
        />

        {!featureFlags.staticStageCount && <DeleteButtonColumn<StageConfig> label="Stage" tooltip={tooltips.remove_stage} data={stages} onClick={removeStage} />}
      </FormGroup>
    </FormSection>
  );
}

type TempEstimationPoint = {
  point_powers: number[],
  temperatures: number[]
}

// eslint-disable-next-line max-lines-per-function
function interpretTempEstimatePoints(csvData: string[][]): TempEstimationPoint[] {
  if (csvData.length < 2) throw new Error(`CSV data needs at least two points (rows).`);

  const data: TempEstimationPoint[] = [];

  for (let i = 0; i < csvData.length; i++) {

    // for now, limiting to 5 stages, therefore 5 values for each, totaling 10 values expected
    if (csvData[i].length != 10) throw new Error(`CSV data does not have the correct number of columns to represent 5 stages at row ${i}.`);

    const point_powers: number[] = [];
    const temperatures: number[] = [];

    for (let j = 0; j < 5; j++) {
      point_powers.push(parseFloat(csvData[i][j]));
      temperatures.push(parseFloat(csvData[i][j + 5]));
    }

    if (point_powers.every((p) => isNaN(p))) {
      throw new Error(`Some of the Point Powers values: '${point_powers}' are not a number.`);
    } else if (temperatures.every((t) => isNaN(t))) {
      throw new Error(`Some of the Temperature values: '${temperatures}' are not a number.`);
    } else {
      const point: TempEstimationPoint = { point_powers, temperatures };
      data.push(point);
    }
  }

  return data;
}

function dataToString(data: TempEstimationPoint[]): string {
  var resultString = "";
  for (let i = 0; i < data.length - 1; i++) {
    resultString += getPAndTValueString(data[i], false);
  }
  const final = data.length - 1;
  if (data.length > 0) resultString += getPAndTValueString(data[final], true);;
  return resultString;
}

function getPAndTValueString(dataPoint: TempEstimationPoint, end: boolean): string {
  let pString: string = "";
  let tString: string = "";
  const length = (dataPoint.point_powers.length + dataPoint.temperatures.length) / 2;
  for (let j = 0; j < length - 1; j++) {
    pString += dataPoint.point_powers[j] + ",";
    tString += dataPoint.temperatures[j] + ",";
  }
  pString += dataPoint.point_powers[length - 1] + ",";
  tString += dataPoint.temperatures[length - 1];
  return "(" + pString + tString + ((end) ? ")" : "),")
}

// eslint-disable-next-line max-lines-per-function
function fromStringToArray(data: string): TempEstimationPoint[] {
  const result: TempEstimationPoint[] = [];

  try {
    const spacesRemoved = data.replaceAll(' ', '');
    const lines = spacesRemoved.split('),(')

    for (let i = 0; i < lines.length; i++) {
      const noBrackets = lines[i].replaceAll('(', '').replaceAll(')', '');
      const values = noBrackets.split(',')

      const point_powers: number[] = [];
      const temperatures: number[] = [];

      const stageNum = values.length / 2;

      for (let j = 0; j < stageNum; j++) {
        point_powers.push(parseFloat(values[j]));
        temperatures.push(parseFloat(values[j + stageNum]));
      }

      if (point_powers.every((p) => isNaN(p))) {
        throw new Error(`Some of the values ${point_powers} could not be interpreted as a number.`)
      } else if (temperatures.every((t) => isNaN(t))) {
        throw new Error(`Some of the values ${temperatures} could not be interpreted as a number.`)
      }

      // TODO: more handeling for if the error is not in the first non whitespace charcter of f or a.

      result.push({ point_powers, temperatures });
    }

    return result;
  } catch (err) {
    alert(err);
    console.error(err);
    return [];
  }
}
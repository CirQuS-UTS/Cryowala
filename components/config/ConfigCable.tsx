"use client"

import { useFridge } from "@/components/config/context";
import { CableConfig, SegmentConfig } from "@/components/pyodide/fridge.d"
import { InputColumn } from "@/components/inputs/default";
import { UniqueInputColumn } from "@/components/inputs/unique";
import { NumericInputColumn } from "@/components/inputs/numeric";
import { DeleteButtonColumn, FormGroup, FormSection, findNextId } from "@/components/config/common";
import { ButtonColumn, UploadButtonColumn } from "../inputs/button";

type DiameterFieldDescription = {
  name: "innerPinDiameter" | "dielectricDiameter" | "outerConductorDiameter",
  label: string,
}
const diameters: DiameterFieldDescription[] = [
  { name: "innerPinDiameter", label: "Inner Pin Dia. (m)" },
  { name: "dielectricDiameter", label: "Dielectric Dia. (m)" },
  { name: "outerConductorDiameter", label: "Outer Conductor Dia. (m)" },
]

const attenuationPoints: number[] = Array(5).fill(0).map((_, i) => i + 1);

type CableConfigProps = {
  tooltips: {
    title: string,
    cable: string,
    thermal_conductivity: string,
    resistivity: string,
    innerPinDiameter: string,
    dielectricDiameter: string,
    outerConductorDiameter: string,
    add_cable: string,
    remove_cable: string,
    cable_attenuation_points: {
      title: string,
      cable: string,
      load_data: string,
      view_data: string
    }
  },
  setModal: React.Dispatch<React.SetStateAction<{
    active: boolean;
    data: string;
    onSubmit: (dataStr: string) => void;
  }>>
}

type BivariatePoint = {
  frequency: number,
  attenuation: number
}

// eslint-disable-next-line max-lines-per-function
export default function FridgeCables({ tooltips, setModal }: CableConfigProps): JSX.Element {
  const { cables, setCables, segments, setSegments } = useFridge();
  const updateCableId = (index: number, oldId: string, value: string) => {
    setSegments(segments.map((item: SegmentConfig) => item.cableId !== oldId ? item : { ...item, cableId: value }));
    updateCable(index, "id", value);
  };
  const updateCable = (index: number, field: string, value: any) => {
    setCables(cables.map((item: CableConfig, i: number) => i !== index ? item : { ...item, [field]: value }));
  };
  const addCable = () => {
    const newCable: CableConfig = {
      id: findNextId(cables, "New Cable"),
      thermalConductivityValue: 0, rho: 0,
      diameters: [0, 0, 0],
      bivariateCableData: [
        { frequency: 0, attenuation: 0 }, { frequency: 0, attenuation: 0 },
        { frequency: 0, attenuation: 0 }, { frequency: 0, attenuation: 0 },
        { frequency: 0, attenuation: 0 }
      ]
    };
    setCables([...cables, newCable]);
  };
  const removeCable = (index: number) => {
    setCables(cables.filter((item: CableConfig, i: number) => i !== index));
  }
  const updateDiameter = (index: number, diameterIndex: number, value: number) => {
    const diameters = cables[index].diameters.map((item: number, i: number) => i !== diameterIndex ? item : value);
    updateCable(index, "diameters", diameters);
  };
  const updateBivariateCableData = (index: number, bivariatePoints: BivariatePoint[]) => {
    updateCable(index, "bivariateCableData", bivariatePoints);
  }

  // eslint-disable-next-line max-lines-per-function
  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = event.target.files;
    if (!files) return alert("No file selected");
    if (files.length !== 1) return alert("Please select exactly one file");

    //apply data from file to appropriate function/storage
    files[0].text().then(
      (text) => {
        try {
          const dataString = dataToString(interpretBivariatePoints(readCSVFile(text)));
          setModal({
            active: true,
            data: dataString,
            onSubmit: (dataStr: string) => {
              const data = fromStringToArray(dataStr);
              if (data.length > 1) {
                updateBivariateCableData(index, data);
              } else {
                alert(`Data Not Loaded: Not enough data points, or an error with interpreting data from the string occured.`);
              }
            }
          })
        } catch (err) {
          alert(err);
          console.log(err);
        }
      }
    );
  }

  const displayCableValues = (index: number, item: CableConfig) => {
    var display: string = '(Frequency, Attenuation)';
    const data = item.bivariateCableData;
    for (let i = 0; i < data.length; i++) {
      display += '\n(' + data[i].frequency + ', ' + data[i].attenuation + '),'
    }
    alert(display);
  }

  return (
    <FormSection>
      <FormGroup title="Cable Types" tooltip={tooltips.title} buttonLabel="Add Cable" buttonTooltip={tooltips.add_cable} onAddClicked={addCable} >
        <UniqueInputColumn<CableConfig> label="Cable Names" tooltip={tooltips.cable} data={cables} valueGetter={(item) => item.id.toString()} valueSetter={(index, item, value) => updateCableId(index, item.id, value)} isUnique={(value: string) => cables.every((item: CableConfig) => item.id !== value)} />
        <NumericInputColumn<CableConfig> label="Thermal Conductivity (W•cm/K)" tooltip={tooltips.thermal_conductivity} data={cables} valueGetter={(item) => item.thermalConductivityValue} valueSetter={(index, item, value) => updateCable(index, "thermalConductivityValue", value)} />
        <NumericInputColumn<CableConfig> label="Resistivity (Ω⋅m)" tooltip={tooltips.resistivity} data={cables} valueGetter={(item) => item.rho} valueSetter={(index, item, value) => updateCable(index, "rho", value)} />
        {diameters.map(({ name, label }, diameterIndex) => (
          <NumericInputColumn<CableConfig> key={`cable-${name}`} label={label} tooltip={tooltips[name]} data={cables} valueGetter={(item) => item.diameters[diameterIndex]} valueSetter={(index, item, value) => updateDiameter(index, diameterIndex, value)} />
        ))}
        <DeleteButtonColumn<CableConfig> label="Cable" data={cables} tooltip={tooltips.remove_cable} onClick={removeCable} />
      </FormGroup>

      <FormGroup title="Cable Attenuation Data" tooltip={tooltips.cable_attenuation_points.title} >
        <InputColumn<CableConfig> key="cable-attenuation-id" label="Cable" tooltip={tooltips.cable_attenuation_points.cable} data={cables} valueGetter={(item: CableConfig) => item.id.toString()} valueSetter={() => undefined} disabled={true} />
        <UploadButtonColumn<CableConfig> label={'Load Cable Attenuation Data'} tooltip={tooltips.cable_attenuation_points.load_data} message="Import CSV File" data={cables} onClick={onFileSelected} />
        <ButtonColumn<CableConfig> label={'View Cable Attenuation Data'} tooltip={tooltips.cable_attenuation_points.view_data} message="View Frequency & Attenuation Points" data={cables} onClick={displayCableValues} />
      </FormGroup>
    </FormSection>
  )
}

export function readCSVFile(fileString: string): string[][] {
  const textByLine = fileString.split(new RegExp("\r?\n"));
  const result = textByLine.map((line) => line.split(","));
  return result;
}

// eslint-disable-next-line max-lines-per-function
function interpretBivariatePoints(csvData: string[][]): BivariatePoint[] {
  if (csvData.length < 2) throw new Error(`CSV data needs at least two points.`);
  if (csvData[0].length != 2) throw new Error(`CSV data is not bivariate.`);

  const data: BivariatePoint[] = [];

  for (let i = 0; i < csvData.length; i++) {
    const frequency = parseFloat(csvData[i][0]);
    const attenuation = parseFloat(csvData[i][1]);
    if (isNaN(frequency)) {
      throw new Error(`Frequency value ${i}: '${csvData[i][0]}' is not a number.`);
    } else if (isNaN(attenuation)) {
      throw new Error(`Attenuation value ${i}: '${csvData[i][1]}' is not a number.`);
    } else {
      const point: BivariatePoint = { frequency, attenuation };
      data.push(point);
    }
  }

  return data;
}

function dataToString(data: BivariatePoint[]): string {
  var resultString = "";
  for (let i = 0; i < data.length - 1; i++) {
    resultString += `(${data[i].frequency},${data[i].attenuation}),`;
  }
  const final = data.length - 1;
  if (data.length > 0) resultString += `(${data[final].frequency},${data[final].attenuation})`;
  return resultString;
}

// eslint-disable-next-line max-lines-per-function
function fromStringToArray(data: string): BivariatePoint[] {
  const result: BivariatePoint[] = [];

  try {
    const spacesRemoved = data.replaceAll(' ', '');
    const lines = spacesRemoved.split('),(')

    for (let i = 0; i < lines.length; i++) {
      const noBrackets = lines[i].replaceAll('(', '').replaceAll(')', '');
      const [f, a] = noBrackets.split(',')

      const frequency = parseFloat(f);
      const attenuation = parseFloat(a)

      if (Number.isNaN(frequency)) {
        throw new Error(`The value ${f} could not be interpreted as a number.`)
      } else if (Number.isNaN(attenuation)) {
        throw new Error(`The value ${a} could not be interpreted as a number.`)
      }

      // TODO: more handeling for if the error is not in the first non whitespace charcter of f or a.

      result.push({ frequency, attenuation });
    }

    return result;
  } catch (err) {
    alert(err);
    console.error(err);
    return [];
  }
}
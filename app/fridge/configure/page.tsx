"use client"

import Stages from "@/components/config/ConfigStage"
import Cables from "@/components/config/ConfigCable"
import Lines from "@/components/config/ConfigLine"
import Segments from "@/components/config/ConfigSegment"
import styles from "@/components/config/Config.module.css"
import { useFridge } from "@/components/config/context"
import { ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { saveAs } from "file-saver"
import configTooltips from "@/components/config/config_tooltips.json"
import Modal from "@/components/inputs/modal"
import { useDimensions } from "@/components/wiremap/wrapper"
import Text from '@/components/inputs/single_value/text';

const Button = (props: JSX.IntrinsicElements["button"]) => (
  <button className={styles.BUTTON} style={{ padding: "0.5em 2.5em", fontSize: "1em", margin: "0", ...props.style }} {...props} />
);

type UploadFileProps = {
  label: string
  onUpload: (file: File) => void
}
function UploadFile({ label, onUpload, ...props }: UploadFileProps): ReactNode {
  const inputRef = useRef<HTMLInputElement>(null);

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return alert("No file selected");
    if (files.length !== 1) return alert("Please select exactly one file");

    onUpload(files[0]);
  }

  return (
    <>
      <input type="file" ref={inputRef} hidden={true} onChange={onFileSelected} />
      <Button onClick={() => inputRef?.current?.click()}>{label}</Button>
    </>
  );
}

type DownloadFileProps = {
  label: string
  mimetype: string
  contents: () => string
}
function DownloadFile({ label, mimetype, contents, ...props }: DownloadFileProps): ReactNode {
  const download = useMemo(() => () => {
    const blob = new Blob([contents()], { type: mimetype });
    saveAs(blob);
  }, [contents, mimetype]);

  return (
    <Button onClick={download}>{label}</Button>
  );
}

function FormControlMenu(): ReactNode {
  const { reset, load, save, import: importFridge, export: exportFridge } = useFridge();

  return (
    <div className="flex flex-row justify-between" style={{ margin: "0.5em 0" }}>
      <Button type="submit" onClick={load}>Load</Button>
      <Button type="submit" onClick={save}>Save</Button>
      <Button type="reset" onClick={reset}>Reset</Button>
      <UploadFile label="Load from File" onUpload={(file) => file.text().then((text) => importFridge(JSON.parse(text))).catch((err: Error) => alert(`Unable to load file: ${err}`))} />
      <DownloadFile label="Save to File" mimetype="application/json" contents={() => JSON.stringify(exportFridge(), null, 2)} />
    </div>
  );
};

function FridgeWatcher(): ReactNode {
  const { stages, cables, lines, segments } = useFridge();

  useEffect(() => console.debug("stages", stages), [stages]);
  useEffect(() => console.debug("cables", cables), [cables]);
  useEffect(() => console.debug("lines", lines), [lines]);
  useEffect(() => console.debug("segments", segments), [segments]);

  return (<></>);
}

type TooltipConfigType = {
  stages: {
    title: string,
    index: string,
    stage_names: string,
    tempertures: string,
    cooling_powers: string,
    add_stage: string,
    remove_stage: string
  },
  cables: {
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
  lines: {
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
  },
  segments: {
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
export default function Page() {
  const { width: totalWidth, height: totalHeight } = useDimensions();

  const tooltipConfigs: TooltipConfigType = configTooltips;

  const [csvModal, setCSVModal] = useState<{
    active: boolean,
    data: string,
    onSubmit: (dataStr: string) => void
  }>({
    active: false,
    data: "",
    onSubmit: (dataStr: string) => null
  })

  return (
    <main>
      <div className={styles.FORM}>
        <ConfigurationModal
          csvModal={csvModal}
          setCSVModal={setCSVModal}
          dimensions={{ width: totalWidth, height: totalHeight }}
        />
        <div>
          <FormControlMenu />
          <Stages tooltips={tooltipConfigs.stages} setModal={setCSVModal} />
          <Cables tooltips={tooltipConfigs.cables} setModal={setCSVModal} />
          <Lines tooltips={tooltipConfigs.lines} />
          <Segments tooltips={tooltipConfigs.segments} />
          <FridgeWatcher />
        </div>
      </div>
    </main >
  );
}

type ConfigurationModalProps = {
  csvModal: {
    active: boolean;
    data: string;
    onSubmit: (dataStr: string) => void;
  },
  setCSVModal: React.Dispatch<React.SetStateAction<{
    active: boolean;
    data: string;
    onSubmit: (dataStr: string) => void;
  }>>,
  dimensions: { width: number, height: number }
}

// eslint-disable-next-line max-lines-per-function
function ConfigurationModal({ csvModal, setCSVModal, dimensions }: ConfigurationModalProps) {
  return (
    <Modal
      showModal={csvModal.active}
      closeModal={() => setCSVModal({ active: false, data: '', onSubmit: () => null })}
      innerStyle='flex flex-col p-8 bg-gray-300 bg-white rounded-2xl'
      outerWidth={dimensions.width}
      outerHeight={dimensions.height}
    >
      <h1 className={'text-center font-bold'}>Confirm CSV Import Data</h1>
      <br />
      <textarea
        value={csvModal.data}
        onChange={(value) => setCSVModal({
          active: csvModal.active,
          data: value.target.value,
          onSubmit: csvModal.onSubmit
        })}
      />
      <Button
        onClick={() => {
          csvModal.onSubmit(csvModal.data);
          setCSVModal({ active: false, data: "", onSubmit: () => null });
        }}
      >Submit Data</Button>
    </Modal>
  )
}
import { ReactNode, useMemo, useRef } from "react"
import { saveAs } from "file-saver"
import { SweepConfiguration } from "@/app/calculate/sweep/page";

const Button = (props: JSX.IntrinsicElements["button"]) => (
    <button className='w-full p-2 mx-1 mb-2 text-white bg-blue-600 rounded-lg' {...props} />
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

type ConfigurationExport = {
    oneD?: {
        lineID: string,
        stageID: string,
        start: number,
        end: number,
        points: number,
        isSamplingLinear: boolean,
        constraints: string[]
    },
    twoD?: {
        lineID2d: string,
        xStageID: string,
        xStart: number,
        xEnd: number,
        xPoints: number,
        yStageID: string,
        yStart: number,
        yEnd: number,
        yPoints: number,
        constraints2d: string[]
    }
}

type SweepConfigTransferProps = {
    config: SweepConfiguration;
    updateConfig: (update: Partial<SweepConfiguration>) => void;
}

// eslint-disable-next-line max-lines-per-function
export default function SweepConfigTransfer({ config, updateConfig }: SweepConfigTransferProps): ReactNode {

    // eslint-disable-next-line max-lines-per-function
    const importConfig = useMemo(() => (data: ConfigurationExport) => {
        if (config.isTwoDimensional && data.twoD) updateConfig({
            lineID2d: data.twoD.lineID2d,
            xStageID: data.twoD.xStageID,
            xStart: data.twoD.xStart,
            xEnd: data.twoD.xEnd,
            xPoints: data.twoD.xPoints,
            yStageID: data.twoD.yStageID,
            yStart: data.twoD.yStart,
            yEnd: data.twoD.yEnd,
            yPoints: data.twoD.yPoints,
            constraints2d: data.twoD.constraints2d,
        });
        else if (!config.isTwoDimensional && data.oneD) updateConfig({
            lineID: data.oneD.lineID,
            stageID: data.oneD.stageID,
            start: data.oneD.start,
            end: data.oneD.end,
            points: data.oneD.points,
            isSamplingLinear: data.oneD.isSamplingLinear,
            constraints: data.oneD.constraints,
        });
        else throw new Error(`Could not read a valid ${(config.isTwoDimensional) ? '2D' : '1D'} configuration from file.`)
    }, [updateConfig, config.isTwoDimensional]);

    // eslint-disable-next-line max-lines-per-function
    const exportConfig: () => ConfigurationExport = useMemo(() => () => {
        if (config.isTwoDimensional) return {
            twoD: {
                lineID2d: config.lineID2d,
                xStageID: config.xStageID,
                xStart: config.xStart,
                xEnd: config.xEnd,
                xPoints: config.xPoints,
                yStageID: config.yStageID,
                yStart: config.yStart,
                yEnd: config.yEnd,
                yPoints: config.yPoints,
                constraints2d: config.constraints2d
            }
        };
        else return {
            oneD: {
                lineID: config.lineID,
                stageID: config.stageID,
                start: config.start,
                end: config.end,
                points: config.points,
                isSamplingLinear: config.isSamplingLinear,
                constraints: config.constraints
            }
        }
    }, [config])

    const load = useMemo(() => (isTwoD: boolean) => {
        const fridgeJSON = JSON.parse(localStorage.getItem(`sweepConfig${isTwoD ? '2D' : '1D'}`)
            || JSON.stringify(exportConfig));
        importConfig(fridgeJSON);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [importConfig]);

    const save = useMemo(() => (isTwoD: boolean) => {
        localStorage.setItem(`sweepConfig${isTwoD ? '2D' : '1D'}`, JSON.stringify(exportConfig()));
    }, [exportConfig]);

    return (
        <div className="flex flex-row justify-center items-center pt-2">
            <Button type='submit' onClick={() => load(config.isTwoDimensional)}>Load</Button>
            <Button type='submit' onClick={() => save(config.isTwoDimensional)}>Save</Button>
            <UploadFile
                label="Import"
                onUpload={(file) => file.text().then(
                    (text) => importConfig(JSON.parse(text))).catch(
                        (err: Error) => alert(`Unable to load file: ${err}`)
                    )
                }
            />
            <DownloadFile
                label="Export"
                mimetype="application/json"
                contents={() => JSON.stringify(exportConfig(), null, 2)}
            />
        </div>
    )
}
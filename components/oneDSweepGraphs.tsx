import { GraphConfiguration1D, SweepData, SweepDataObject } from "@/app/calculate/sweep/page"
import { FC, PropsWithChildren, ReactNode } from "react"
import LineGraph, { LineGraphProps } from "./graphs/lineGraph"
import { useFridge } from "./config/context";
import { Dimensions, useDimensions } from "@/components/useDimensions";

type Graph = FC<Dimensions>;

type OneDGraphsProps = {
    sweepData: SweepDataObject,
    oneDGraphConfig: GraphConfiguration1D,
    lineSignalTypes: ("Drive" | "Flux" | "Output")[],
    noiseTypes: string[],
    filterLines: (data: SweepData[], graphID: number, lineSignalTypes: ("Drive" | "Flux" | "Output")[], selected: boolean[][][], showTotalLines: boolean[], nSelected?: boolean[]) => SweepData[],
    setModal: React.Dispatch<React.SetStateAction<React.JSX.Element | null>>
}

// eslint-disable-next-line max-lines-per-function
export default function OneDSweepGraphs({ sweepData, oneDGraphConfig, lineSignalTypes, noiseTypes, filterLines, setModal }: OneDGraphsProps): ReactNode {
    const [ref, dimensions] = useDimensions<HTMLDivElement>();

    const fridge = useFridge();
    const stages = fridge.stages
        .map((s, i) => { return { stage: s.id, id: i } })
        .filter((_, i) => oneDGraphConfig.showStages[i]);

    const displayOptions = {
        heatLoad: oneDGraphConfig.showColumns[0],
        temperature: oneDGraphConfig.showColumns[1],
    };

    const rowCount = stages.length + (oneDGraphConfig.showNoiseRow ? 1 : 0);

    const rowHeight = (dimensions.height - SWEEP_TITLE_HEIGHT) / rowCount;

    const noiseWidth = (dimensions.width - STAGE_LABEL_WIDTH) / oneDGraphConfig.showColumns.filter(item => item).length;

    return (
        <div ref={ref} className="flex flex-col w-full h-full" style={{ backgroundColor: "gainsboro" }}>
            <OneDimensionalSweepTitles displayOptions={displayOptions} />

            {/* Stages */}
            {/* eslint-disable-next-line max-lines-per-function */}
            {stages.map((s) => (
                <OneDimensionalSweepStage key={s.id}
                    stage={s.stage}
                    width={dimensions.width}
                    height={rowHeight}
                    displayOptions={displayOptions}
                    heatloadGraph={DimensionlessLineGraph({
                        data: filterLines(sweepData.sweepData[0][s.id], s.id, lineSignalTypes, oneDGraphConfig.showLines, oneDGraphConfig.showTotalLines),
                        fullData: sweepData.sweepData[0][s.id],
                        stage: s.stage,
                        graphID: s.id,
                        type: 'heatLoad',
                        xLabel: "Attenuation on " + s.stage,
                        yLabel: "Heat Load",
                        linear: oneDGraphConfig.scaleLin,
                        setModal: setModal,
                        modalDimensions: dimensions
                    })}
                    temperatureGraph={DimensionlessLineGraph({
                        data: sweepData.sweepData[1][s.id],
                        fullData: sweepData.sweepData[1][s.id],
                        stage: s.stage,
                        graphID: s.id,
                        type: 'temperature',
                        xLabel: "Attenuation on " + s.stage,
                        yLabel: "Temperature",
                        linear: oneDGraphConfig.scaleLin,
                        setModal: setModal,
                        modalDimensions: dimensions
                    })}
                />
            ))}

            {/* Noise */}
            {oneDGraphConfig.showNoiseRow && (
                <div className="flex flex-row w-full h-full">
                    <CenteredText style={{ width: STAGE_LABEL_WIDTH }}>Noise</CenteredText>
                    {oneDGraphConfig.showColumns[0] && <LineGraph
                        data={filterLines(sweepData.noiseData[oneDGraphConfig.noiseType], stages.length, lineSignalTypes, oneDGraphConfig.showLines, oneDGraphConfig.showTotalLines, oneDGraphConfig.noiseCont)}
                        fullData={sweepData.noiseData[oneDGraphConfig.noiseType]}
                        stage={'Noise'}
                        graphID={stages.length}
                        type={'heatLoad'}
                        xLabel={"Attenuation"}
                        yLabel={"Noise " + noiseTypes[oneDGraphConfig.noiseType]}
                        height={rowHeight}
                        width={noiseWidth}
                        linear={oneDGraphConfig.scaleLin}
                        setModal={setModal}
                        modalDimensions={dimensions}
                    />}
                    {!oneDGraphConfig.showColumns[0] && oneDGraphConfig.showColumns[1] && <LineGraph
                        data={filterLines(sweepData.noiseData[oneDGraphConfig.noiseType], stages.length, lineSignalTypes, oneDGraphConfig.showLines, oneDGraphConfig.showTotalLines, oneDGraphConfig.noiseCont)}
                        fullData={sweepData.noiseData[oneDGraphConfig.noiseType]}
                        stage={'Noise'}
                        graphID={stages.length}
                        type={'heatLoad'}
                        xLabel={"Attenuation"}
                        yLabel={"Noise " + noiseTypes[oneDGraphConfig.noiseType]}
                        height={rowHeight}
                        width={noiseWidth}
                        linear={oneDGraphConfig.scaleLin}
                        setModal={setModal}
                        modalDimensions={dimensions}
                    />}
                </div>
            )}
        </div>
    );
}

interface CenteredTextProps extends React.HTMLAttributes<HTMLDivElement> {
    className?: string,
}
function CenteredText({ className, children, ...props }: PropsWithChildren<CenteredTextProps>): ReactNode {
    return (
        <div className={["flex flex-col items-center justify-center", className].join(" ")} {...props}>
            <p>{children}</p>
        </div>
    )
}

type DisplayOptions = {
    heatLoad: boolean,
    temperature: boolean,
}

const SWEEP_TITLE_HEIGHT = 50;
type OneDimensionalSweepTitlesProps = {
    displayOptions: DisplayOptions,
}
function OneDimensionalSweepTitles({ displayOptions }: OneDimensionalSweepTitlesProps): ReactNode {
    return (
        <div className="flex flex-row w-full" style={{ height: SWEEP_TITLE_HEIGHT }}>
            <CenteredText style={{ width: STAGE_LABEL_WIDTH }}>Stage</CenteredText>
            {displayOptions.heatLoad && (
                <CenteredText className="flex-grow" style={{ width: STAGE_LABEL_WIDTH }}>Heat Load</CenteredText>
            )}
            {displayOptions.temperature && (
                <CenteredText className="flex-grow" style={{ width: STAGE_LABEL_WIDTH }}>Temperature</CenteredText>
            )}
        </div>
    )
}


type OneDimensionalSweepStageProps = {
    stage: string,
    width: number,
    height: number,

    displayOptions: DisplayOptions,

    heatloadGraph: Graph,
    temperatureGraph: Graph,
}

const STAGE_LABEL_WIDTH = 50;
// eslint-disable-next-line max-lines-per-function
function OneDimensionalSweepStage({
    stage,
    width: totalWidth,
    height,
    displayOptions,
    heatloadGraph: HeatLoadGraph,
    temperatureGraph: TemperatureGraph,
}: OneDimensionalSweepStageProps): ReactNode {
    var diplayedColumnCount = 0;
    if (displayOptions.heatLoad) diplayedColumnCount++;
    if (displayOptions.temperature) diplayedColumnCount++;

    const width = (totalWidth - STAGE_LABEL_WIDTH) / diplayedColumnCount;

    return (
        <div className="flex flex-row w-full h-full">
            <CenteredText style={{ width: STAGE_LABEL_WIDTH }}>{stage}</CenteredText>

            {displayOptions.heatLoad && <HeatLoadGraph width={width} height={height} />}
            {displayOptions.temperature && <TemperatureGraph width={width} height={height} />}
        </div>
    )
}

type DimensionlessLineGraphProps = Omit<LineGraphProps, "width" | "height">;
function DimensionlessLineGraph(props: DimensionlessLineGraphProps): FC<Dimensions> {
    const graphWithProps = ({ width, height }: Dimensions) => (
        <LineGraph {...props} width={width} height={height} />
    );
    return graphWithProps;
}
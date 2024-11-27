import React from 'react';
import { Group } from "@visx/group";
import { scaleLog, scaleLinear } from "@visx/scale";
import { AxisBottom } from "@visx/axis";
import { LinePath } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import ReactDomServer from 'react-dom/server';
import DualVerticalAxis from './dualVerticalAxis';
import { Dimensions } from '../useDimensions';
import { SweepData } from '@/app/calculate/sweep/page';

export type LineGraphProps = {
    data: SweepData[],
    fullData: SweepData[],
    stage: string,
    graphID: number,
    type: string,
    xLabel: string,
    yLabel: string,
    height: number,
    width: number,
    linear: boolean[],
    setModal: React.Dispatch<React.SetStateAction<React.JSX.Element | null>>,
    modalDimensions: Dimensions
};

// accessors
const x = (d: SweepData) => d.range;
const y = (d: SweepData) => d.lines;
const l = (d: SweepData) => d.labels;
const c = (d: SweepData) => d.colours;

type GraphDefinition = {
    data: SweepData[],
    fullData: SweepData[],
    width: number,
    height: number,
    xOffsetPer: number,
    yOffsetPer: number,
    linear: boolean[],
    xLabel: string,
    yLabel: string,
    type: string,
    graphID: number,
    toSVG: boolean
}

// determine placement of legend labels in exported graph
// eslint-disable-next-line max-lines-per-function
function getDistances(index: number, labels: string[], xMax: number): [number, number] {
    const xPos: number[] = [];
    var longest: number = 0;
    for (let l = 0; l < labels.length; l++) {
        xPos.push(labels[l].length * 20);
        if (labels[l].length > longest) longest = labels[l].length;
    }
    var currSum: number = 0;
    var row = 0;
    const legendLength = (longest * 15) + 20;
    for (let d = 0; d < index; d++) {
        var startXPos: number = currSum + legendLength;
        var widthAdded: number = startXPos + legendLength;
        if (widthAdded < xMax || currSum == 0) currSum = startXPos;
        else {
            currSum = 0;
            row++;
        }
    }
    return [currSum, row];
}

// eslint-disable-next-line max-lines-per-function
function generateGraph({ data, fullData, width, height, xOffsetPer, yOffsetPer, linear, xLabel, yLabel, type, graphID, toSVG }: GraphDefinition): { graph: React.JSX.Element, warnings: string[] } {

    const labelFontSize = Math.max(height / 45, 10);
    const tickLabelFontSize = Math.max(height / 50, 10);

    const topOffsetDivisor = (toSVG) ? 6 : 3;
    const leftOffsetDivisor = (toSVG) ? 3 : 1.3;

    const axisLabelHeight = labelFontSize * 2;

    // calculate bounds
    const gWidth = width - axisLabelHeight;
    const gHeight = height - axisLabelHeight;

    const xOffset = gWidth * xOffsetPer;
    const yOffset = gHeight * yOffsetPer;

    const xMax = gWidth - xOffset;
    const yMax = gHeight - yOffset;

    // generate scales
    const xScale = (linear[0]) ? scaleLinear({
        range: [0, xMax],
        domain: [Math.min(...data.map(x)), Math.max(...data.map(x))],
    }) : scaleLog({
        range: [0, xMax],
        domain: [Math.min(...data.map(x)), Math.max(...data.map(x))],
    });

    const yScale = (linear[1]) ? scaleLinear({
        range: [0, yMax],
        domain: (() => {
            let result: number[] = [0, Infinity];
            for (let i = 0; i < data.map(y).length; i++) {
                result = [
                    Math.max(result[0], ...data.map(y)[i].filter(Boolean)),
                    Math.min(result[1], Math.min.apply(null, data.map(y)[i].filter(Boolean)))
                ]
            }
            result[0] = result[0] * 1.1;
            result[1] = result[1] * 0.9;
            return [result[0], (result[1] >= 0) ? result[1] : 0]
        })(),
    }) : scaleLog({
        range: [0, yMax],
        domain: (() => {
            let result: number[] = [0, Infinity];
            for (let i = 0; i < data.map(y).length; i++) {
                result = [
                    Math.max(result[0], ...data.map(y)[i].filter(Boolean)),
                    Math.min(result[1], Math.min.apply(null, data.map(y)[i].filter(Boolean)))
                ]
            }
            const upperPower: number = Math.pow(10, Math.ceil(Math.log10(result[0])));
            const lowerPower: number = Math.pow(10, Math.floor(Math.log10(result[1])));
            return [upperPower, lowerPower];
        })(),
    });

    //determine major and minor ticks
    const verticalTicks: { major: number[], minor: number[] } = {
        major: [],
        minor: []
    }
    if (linear[1]) {
        yScale.ticks(5).forEach((t) =>
            verticalTicks.major.push(t)
        )
    } else {
        yScale.ticks(5).forEach((t) =>
            (Math.log10(Number(t)) % 1 == 0)
                ? verticalTicks.major.push(t)
                : verticalTicks.minor.push(t)
        );
    }

    type LinePoint = {
        x: number;
        y: number;
    }

    type Line = {
        points: LinePoint[];
        colour: string;
    }

    type LinesGroup = Line[];

    // eslint-disable-next-line max-lines-per-function
    function generateLines(): { lines: LinesGroup[], warnings: string[] } {
        const xValues = data.map(x);
        const yValues = data.map(y);
        // const yValues = data.map(y).map((a, i) => a.map((n) => (i % 3 == 1) ? NaN : n));

        const lineCount = data.map(c)[0].length;

        const pointCount = xValues.length;

        const lineLabels: string[] = [...data.map(l)[0]];

        const linesToDraw: LinesGroup[] = [];
        // [line group][line][point on the line]
        // result[0][0][0].x/y

        const warnings: string[] = [];

        // line group
        for (let g = 0; g < lineCount; g++) {
            // for each group, check all points in that group, and generate a line, 
            // broken up by NaN values
            const group: LinesGroup = [];
            const lineColour: string = data[0].colours[g];
            var line: Line = { points: [], colour: lineColour };

            var warned = false;

            for (let p = 0; p < pointCount; p++) {
                // generate each point, adding it to the current line
                // when reaching a NaN value, end the current line and start a new one,
                // but the first value of that new line is the first non NaN value encountered
                // after reaching the last point, add the current line to the result, 
                // if it has any values
                const point: LinePoint = { x: xScale(xValues[p]), y: yScale(yValues[p][g]) }

                if (isNaN(point.y)) {
                    if (line.points.length > 0) {
                        group.push(line);
                        line = { points: [], colour: lineColour };
                    }
                    if (!warned) {
                        warnings.push("Error(s) on line: " + lineLabels[g]);
                        warned = true;
                    }
                } else {
                    line.points.push(point);
                }
                if (p == pointCount - 1 && line.points.length > 0) {
                    group.push(line);
                    line = { points: [], colour: lineColour };
                }
            }

            linesToDraw.push(group);
        }

        // console.log(`${type} - ${graphID}`)
        // console.log('rawData', data)
        // console.log('linesToDraw', linesToDraw)

        return { lines: linesToDraw, warnings };
    }

    const { lines, warnings } = generateLines();

    // get colours of lines
    const cLines: string[] = [...data.map(c)[0]];

    // get labels of lines
    const lineLabels: string[] = [...data.map((d: any) => d.labels)[0]];
    const lineLabelsFull: string[] = [...fullData.map((d: any) => d.labels)[0]];

    const legendGlyphSize = 15;

    function generateTopPos(index: number, labels: string[]): number {
        const [xPos, yPos] = getDistances(index, labels, xMax);
        return ((yMax + yOffset / 2) - legendGlyphSize) + yPos * 30;
    }

    function generateLeftPos(index: number, labels: string[]): number {
        const [xPos, yPos] = getDistances(index, labels, xMax);
        return (xOffset / 2) + (xPos);
    }



    const graph = (<svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} key={"group-" + type + '-' + graphID}>
        <Group top={yOffset / topOffsetDivisor} left={(xOffset / leftOffsetDivisor) + axisLabelHeight} >
            <DualVerticalAxis
                directionality={"left"}
                thirdAxis={false}
                scale={yScale}
                label={yLabel}
                labelProps={{ fontSize: labelFontSize, textAnchor: 'middle' }}
                majorTicks={verticalTicks.major}
                minorTicks={verticalTicks.minor}
                majorTickFormat={
                    (linear[1])
                        ? (d) => yScale.tickFormat(5, ".1e")(d)
                        : (d) => yScale.tickFormat(5, ".0e")(d)}
                minorTickFormat={() => ""}
                tickLabelProps={{ fontSize: tickLabelFontSize }}
                majorTickLength={8}
                minorTickLength={4}
            />
            <AxisBottom
                scale={xScale}
                label={xLabel}
                labelProps={{ fontSize: labelFontSize, textAnchor: 'middle' }}
                numTicks={5}
                tickLabelProps={{ fontSize: tickLabelFontSize }}
                top={yMax}
            />
            {lines.map((g, i) =>
                g.map((l, j) =>
                    <LinePath
                        key={"line-" + type + '-' + graphID + '-' + i + '-' + j}
                        data={l.points}
                        curve={curveLinear}
                        x={(l) => l.x}
                        y={(l) => l.y}
                        stroke={l.colour}
                        strokeWidth={1.5}
                    />
                )
            )}
        </Group>
        {toSVG && cLines.map((c, i) =>
            <Group
                top={generateTopPos(i, lineLabelsFull)}
                left={generateLeftPos(i, lineLabelsFull) + axisLabelHeight}
                key={"legend-" + type + '-' + graphID + '-' + i}
            >
                <rect
                    fill={c}
                    width={legendGlyphSize}
                    height={legendGlyphSize}
                    strokeWidth={5}
                    stroke={c}
                />
                <text x={24} y={12}>
                    {lineLabels[i]}
                </text>
            </Group>
        )}
    </svg>)
    return { graph, warnings }
}

// eslint-disable-next-line max-lines-per-function
function generateCSV(data: any[], fullData: any[]) {

    // calculate CSV output
    const lineLabels: string[] = [...data.map((d: any) => d.labels)[0]];
    const lineLabelsFull: string[] = [...fullData.map((d: any) => d.labels)[0]];
    const lineValues: number[][] = fullData.map((d: any) => d.lines);
    const points = [...data.map(x)];

    const csvValues: string[] = [];
    //swap columns according to the type so that the total columns are last
    const reorder: number[][] = [[], [], [], []];
    for (let m = 0; m < lineLabelsFull.length; m++) {
        if (lineLabelsFull[m].match('Passive') != null) reorder[1].push(m);
        else if (lineLabelsFull[m].match('Active') != null) reorder[2].push(m);
        else if (lineLabelsFull[m].match('Total') != null) reorder[3].push(m);
        else reorder[0].push(m);
    }
    const reorderFlat: number[] = reorder.flat();

    // rearrange order of values to match the order determined
    function rearrange(rows: number[][], pos: number[]) {
        return rows.map(function (cols) {
            return pos.map(function (i) {
                return cols[i];
            });
        });
    }

    const lineLabelsReordered: string[] = reorderFlat.map((r) => lineLabels[r]);
    const lineValuesReordered: number[][] = rearrange(lineValues, reorderFlat);

    const lineValuesAsString: string[][] = lineValuesReordered.map(r => r.map((val) => isNaN(val) ? 'nan' : val.toString()));

    //for lines displayed vertically
    csvValues.push('X-Axis,' + lineLabelsReordered.toString());
    for (let i = 0; i < lineValues.length; i++) {
        csvValues.push(String(points[i] + ',' + lineValuesAsString[i].toString()));
    }

    return csvValues;
}

// eslint-disable-next-line max-lines-per-function
function LineGraph({ data, fullData, stage, graphID, type, xLabel = "X-Axis", yLabel = "Y-Axis", height, width, linear = [true, false], setModal, modalDimensions }: LineGraphProps) {

    function graphProps(gWidth: number, gHeight: number, gOffsetX: number, gOffsetY: number, gToSVG: boolean): GraphDefinition {
        return {
            data: data,
            fullData: fullData,
            width: gWidth,
            height: gHeight,
            xOffsetPer: gOffsetX,
            yOffsetPer: gOffsetY,
            linear: linear,
            xLabel: xLabel,
            yLabel: yLabel,
            type: type,
            graphID: graphID,
            toSVG: gToSVG
        }
    }

    // generate graphs
    const graph = generateGraph(graphProps(width, height, 0.175, 0.3, false));
    const exportGraph = generateGraph(graphProps(1080, 720, 0.2, 0.4, true));
    const graphExport: string = ReactDomServer.renderToStaticMarkup(exportGraph.graph);

    const modalGraph = generateGraph(graphProps(modalDimensions.width, modalDimensions.height, 0.175, 0.275, false));

    //generate csv values
    const csvValues = generateCSV(data, fullData);

    const csvOutput = new Blob([csvValues.join('\n')], { type: 'text/csv' });
    const svgOutput = new Blob([graphExport], { type: 'image/svg' });

    function exportFile(file: Blob, filename: string) {
        const objectUrl = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    }

    return (
        <div className={`group flex flex-row relative w-[${width}] h-[${height}]`}>
            <button
                className="hidden group-hover:block absolute top-4 right-10 bg-zinc-800 text-white px-2 rounded-lg"
                onClick={() => exportFile(svgOutput, String(((stage == 'Noise') ? "" : type + "-") + stage + "-graph.svg"))}
            >SVG</button>
            <button
                className="hidden group-hover:block absolute top-4 right-[5.5rem] bg-zinc-800 text-white px-2 rounded-lg"
                onClick={() => exportFile(csvOutput, String(((stage == 'Noise') ? "" : type + "-") + stage + "-values.csv"))}
            >CSV</button>
            {graph.warnings.length > 0 && (
                <button
                    className="block absolute top-4 right-2 bg-red-600 text-white px-2 rounded-lg cursor-help font-serif"
                    title={graph.warnings.join('\n')}
                >
                    ⚠
                </button>
            )}
            <div
                onClick={() => setModal(modalGraph.graph)}
                className={"cursor-zoom-in"}
            >
                {graph.graph}
            </div>
        </div>
    );
};

export default LineGraph;
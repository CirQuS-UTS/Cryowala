import React from 'react';
import { Group } from "@visx/group";
import { scaleLog, scaleLinear } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { LinePath, Polygon } from "@visx/shape";
import { curveLinear } from "@visx/curve";
import { ContourMultiPolygon, contours } from 'd3-contour';
import DualVerticalAxis from './dualVerticalAxis';
import ColourBar from './colourBar';
import { GraphContour, twoDGraphData } from '@/app/calculate/sweep/page';
import ReactDomServer from 'react-dom/server';

export type ColourGraphProps = {
    data: twoDGraphData,
    size: number,
    contourDefs: GraphContour[],
    scale: [number, number] | "auto",
    colourInterpolator: (d: number) => string,
    labels: {
        x: string,
        y: string
    },
    setModal: React.Dispatch<React.SetStateAction<React.JSX.Element | null>>
}

type Point = {
    x: number,
    y: number
}

type Range = {
    min: number,
    max: number
}

type GraphDefinition = {
    data: number[][],
    name: string,
    size: number,
    columns: number,
    rows: number,
    xRange: [number, number],
    yRange: [number, number],
    colourInterpolator: (d: number) => string,
    colourRange: Range,
    contourLines: ContourMultiPolygon[],
    contourDefs: GraphContour[]
    labels: {
        x: string,
        y: string,
        colour: string
    }
}

// eslint-disable-next-line max-lines-per-function
function generateGraph({ data, name, size, columns, rows, xRange, yRange, colourInterpolator, colourRange, contourLines, contourDefs, labels }: GraphDefinition): React.JSX.Element {
    const offset: number = size * 0.35;
    const innerSize: number = size - offset;
    const xSize: number = innerSize / columns;
    const ySize: number = innerSize / rows;

    // scale for bottom axis
    const xScale = scaleLinear({
        range: [0, innerSize],
        domain: [xRange[0], xRange[1]],
    });

    // scale for left axis
    const yScale = scaleLinear({
        range: [0, innerSize],
        domain: [yRange[1], yRange[0]],
    });

    // x scale for contour lines
    const xPointScale = scaleLinear({
        range: [0, innerSize],
        domain: [0, columns],
    });

    // y scale for contour lines
    const yPointScale = scaleLinear({
        range: [innerSize, 0],
        domain: [rows, 0],
    });

    // scale for mapping range for colour interpretation
    const colourScale = scaleLog({
        range: [0, 1],
        domain: [
            colourRange.min,
            colourRange.max
        ]
    });

    // scale for ticks on colour bar
    const colourBarScale = scaleLog({
        range: [0, innerSize],
        domain: [colourRange.max, colourRange.min]
    });

    const verticalTicks: { major: number[], minor: number[], minorLabel: number[] } = {
        major: [],
        minor: [],
        minorLabel: []
    }

    colourBarScale.ticks(5).forEach((t) => (
        Math.log10(Number(t)) % 1 == 0)
        ? verticalTicks.major.push(t)
        : verticalTicks.minor.push(t)
    );

    var majorTickFormatter = (d: number) => colourBarScale.tickFormat(Infinity, ".0e")(d)

    if (verticalTicks.major.length < 2) {
        // if there are not enough major or minor ticks, set the range bounds as major ticks
        if (verticalTicks.minor.length == 0) {
            verticalTicks.major.push(colourBarScale.range()[0]);
            verticalTicks.major.push(colourBarScale.range()[1]);

        } else {
            // if there is at least one minor tick, set the first minor tick as a labeled tick
            const first = verticalTicks.minor.shift();
            verticalTicks.minorLabel.push((first) ? first : 0);

            if (verticalTicks.minor.length > 0) {
                // if there are more minor ticks, set the last minor tick as a labeled tick
                const last = verticalTicks.minor.pop();
                verticalTicks.minorLabel.push((last) ? last : 0);
            }
        }
        // update the majorTickFormatter to show more precision for such ticks
        majorTickFormatter = (d: number) => colourBarScale.tickFormat(Infinity, ".2e")(d)
    }

    const titleFontSize = size / 25;
    const labelFontSize = size / 35;
    const tickLabelFontSize = innerSize / 25;

    const topOffset = size * 0.15;
    const titleOffset = size * 0.1;
    const colourGraphOffset = innerSize * 0.18;
    const colourBarOffset = innerSize * 1.2;
    const colourBarWidth = innerSize * 0.1;

    return (<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} key={"colourGraph-"}>
        <text x="50%" y={titleOffset} dominantBaseline="top" textAnchor="middle" fontSize={titleFontSize}>{name}</text>
        <Group key={`${name}-graph`} top={topOffset} left={colourGraphOffset} >
            <Group key={'colour-map'}>
                {data.map((c, i) =>
                    c.map((r, j) =>
                        <Polygon
                            key={'colour-map-point-' + i + '-' + j}
                            points={[
                                [(j * xSize), (i * ySize)],
                                [(j * xSize), ((i + 1) * ySize)],
                                [((j + 1) * xSize), ((i + 1) * ySize)],
                                [((j + 1) * xSize), (i * ySize)]
                            ]}
                            fill={(r > 0) ? (r < colourRange.min || r > colourRange.max) ? 'rgba(0,0,0,0)' : colourInterpolator(colourScale(r)) : 'rgba(0,0,0,0)'}
                        />
                    )
                )}
            </Group>
            <Group key={'contours-lines'}>
                {contourLines.map((contour, l) =>
                    <Group key={'contour-height-' + contour.value}>
                        {contour.coordinates.map((data, d) =>
                            <LinePath
                                key={'contour-height-' + contour.value + '-' + l + '-' + d}
                                data={data?.[0] ?? []}
                                curve={curveLinear}
                                x={(d) => xPointScale(d[0])}
                                y={(d) => yPointScale(d[1])}
                                stroke={contourDefs[l].colour}
                                strokeWidth={1.5}
                            />
                        )}
                    </Group>
                )}
            </Group>
            <AxisLeft
                scale={yScale}
                label={labels.y}
                labelProps={{ fontSize: labelFontSize, textAnchor: 'middle', y: '-3em' }}
                numTicks={5}
                tickLabelProps={{ fontSize: tickLabelFontSize }}
            />
            <AxisBottom
                scale={xScale}
                label={labels.x}
                labelProps={{ fontSize: labelFontSize, textAnchor: 'middle', y: '4em' }}
                numTicks={5}
                top={innerSize}
                tickLabelProps={{ fontSize: tickLabelFontSize }}
            />
        </Group>
        <Group key={`colour-bar-${name}`} top={topOffset} left={colourBarOffset}>
            <ColourBar
                top={0}
                height={innerSize}
                left={0}
                right={colourBarWidth}
                colourInterp={colourInterpolator}
            />
            <DualVerticalAxis
                directionality={"right"}
                thirdAxis={true}
                scale={colourBarScale}
                label={labels.colour}
                labelProps={{ fontSize: labelFontSize, textAnchor: 'middle' }}
                majorTicks={verticalTicks.major}
                minorTicks={verticalTicks.minor}
                majorTickFormat={majorTickFormatter}
                minorTickFormat={() => ""}
                tickLabelProps={{ fontSize: tickLabelFontSize }}
                majorTickLength={8}
                minorTickLength={4}
                offset={colourBarWidth}
                thirdAxisTicks={verticalTicks.minorLabel}
                thirdAxisTickFormat={majorTickFormatter}
            />
            <Group key={'colour-bar-contour-lines'}>
                {contourDefs.map((contour) =>
                    <LinePath
                        key={'contour-legend-height-' + contour.level}
                        data={[
                            { x: 0, y: contour.level },
                            { x: colourBarWidth, y: contour.level }
                        ]}
                        curve={curveLinear}
                        x={(d: Point) => d.x}
                        y={(d: Point) => colourBarScale(d.y)}
                        stroke={contour.colour}
                        strokeWidth={1.5}
                    />
                )}
            </Group>
        </Group>
    </svg>)
}

// eslint-disable-next-line max-lines-per-function
function generateCSV(
    data: twoDGraphData,
    columns: number,
    rows: number
): { x: Blob, y: Blob, z: Blob } {
    //csv output
    const xValues: number[][] = [];
    const yValues: number[][] = [];
    const zValues: string[][] = data.data.map((a) => a.map((b) => (b == 0) ? "nan" : String(b)));

    for (let i = 0; i < rows; i++) { // y axis
        xValues.push(data.shape.x); //also a shallow copy, still fine
        const yRow: number[] = [];
        for (let j = 0; j < columns; j++) { // x axis
            yRow.push(data.shape.y[(rows - 1) - i]);
        }
        yValues.push(yRow);
    }

    return {
        x: new Blob([xValues.join('\n')], { type: 'text/csv' }),
        y: new Blob([yValues.join('\n')], { type: 'text/csv' }),
        z: new Blob([zValues.join('\n')], { type: 'text/csv' })
    }
}

// eslint-disable-next-line max-lines-per-function
function ColourGraph({ data, size, contourDefs, scale, colourInterpolator, labels, setModal }: ColourGraphProps) {
    const dataLoaded = data.data;
    const [columns, rows] = [data.shape.x.length, data.shape.y.length];

    const valueArrayFlat: number[] = dataLoaded.map((d) => d.map((v) => v)).flat();

    const colourRange: Range = (scale == "auto") ? {
        min: Math.min.apply(null, valueArrayFlat.filter(Boolean)),
        max: Math.max.apply(null, valueArrayFlat.filter(Boolean))
    } : {
        min: scale[0],
        max: scale[1]
    }

    // determine values for contour lines
    const contourGenerator = contours().size([columns, rows]).thresholds(contourDefs.map(c => c.level)).smooth(false);
    const contourLines = contourGenerator(dataLoaded.flatMap((x) => x));

    // reorder contourLines to same order as contourDefs
    const sortedContourLines: ContourMultiPolygon[] = []
    contourDefs.forEach(
        (d) => {
            const nextPos: number[] = [];
            contourLines.forEach((l, k) => { if (l.value == d.level) nextPos.push(k) });
            if (nextPos.length > 0) {
                sortedContourLines.push(contourLines[nextPos[0]]);
                contourLines.toSpliced(nextPos[0], 1);
            }
        }
    );

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

    function graphProps(gSize: number): GraphDefinition {
        return {
            data: dataLoaded,
            name: data.name.type + " " + data.name.target + " Graph",
            size: gSize,
            columns: columns,
            rows: rows,
            xRange: [data.shape.x[0], data.shape.x[columns - 1]],
            yRange: [data.shape.y[0], data.shape.y[rows - 1]],
            colourInterpolator: colourInterpolator,
            colourRange: colourRange,
            contourLines: contourLines,
            contourDefs: contourDefs,
            labels: {
                x: labels.x,
                y: labels.y,
                colour: data.colourlabel
            }
        }
    }

    const graph = generateGraph(graphProps(size));
    const exportGraph = generateGraph(graphProps(720));
    const modalGraph = generateGraph(graphProps(size * 2))
    const graphExport: string = ReactDomServer.renderToStaticMarkup(exportGraph);

    const svgOutput = new Blob([graphExport], { type: 'image/svg' });

    const csvOutput = generateCSV(data, columns, rows);

    return (
        <div className="group flex flex-row relative w-full h-full justify-center items-center">
            <button
                key={`export-${data.name.type + "-" + data.name.target}-2D-graph`}
                className="hidden group-hover:block absolute top-4 right-8 bg-zinc-800 text-white px-2 rounded-lg"
                onClick={() => exportFile(svgOutput, String(data.name.type + "-" + data.name.target + "-2D-graph.svg"))}
            >SVG</button>
            <button
                key={`export-${data.name.type + "-" + data.name.target}-2D-values`}
                className="hidden group-hover:block absolute top-4 right-20 bg-zinc-800 text-white px-2 rounded-lg"
                onClick={() => {
                    exportFile(csvOutput['x'], String(data.name.type + "-" + data.name.target + "-2D-x-values.csv"));
                    exportFile(csvOutput['y'], String(data.name.type + "-" + data.name.target + "-2D-y-values.csv"));
                    exportFile(csvOutput['z'], String(data.name.type + "-" + data.name.target + "-2D-z-values.csv"));
                }}
            >CSV</button>
            <div
                onClick={() => setModal(modalGraph)}
                className={"cursor-zoom-in"}
            >
                {graph}
            </div>
        </div>
    )
}

export default ColourGraph;
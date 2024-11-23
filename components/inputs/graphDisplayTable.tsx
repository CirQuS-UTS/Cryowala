"use client";

import style from "@/app/App.module.css";
import React, { useEffect, useRef, useState } from 'react';
import { GraphConfiguration1D } from "@/app/calculate/sweep/page";
import { LineConfig } from "@/components/pyodide/fridge.d"

export type HeatTableProps = {
    stage: string,
    lines: LineConfig[],
    colours: string[],
    graphID: number,
    config: GraphConfiguration1D,
    setConfig: (config: GraphConfiguration1D) => void
};

type LineSelectorProps = {
    config: GraphConfiguration1D,
    cols: string[][],
    id: string,
    signalType: "Output" | "Drive" | "Flux",
    i: number,
    graphID: number,
    updateConfig: (update: Partial<GraphConfiguration1D>) => void,
    toggleRow: (lineID: number) => void
}

// eslint-disable-next-line max-lines-per-function
function LineSelectors({ config, cols, id, signalType, i, graphID, updateConfig, toggleRow }: LineSelectorProps) {
    return (
        <tr className={style.TR} key={'row-' + graphID + '-' + id}>
            <td
                className={style.TD}
                style={{ cursor: 'pointer' }}
                onClick={() => toggleRow(i)}
                key={'name-' + graphID + '-' + id}
            >{id}</td>
            <td className={style.TC} key={'passive-' + graphID + '-' + id}>
                <input
                    type="checkbox"
                    checked={config.showLines[graphID][i][0]}
                    onChange={() =>
                        updateConfig({
                            showLines: config.showLines.toSpliced(
                                graphID, 1, config.showLines[graphID].toSpliced(
                                    i, 1, config.showLines[graphID][i].toSpliced(
                                        0, 1, !config.showLines[graphID][i][0]
                                    )
                                )
                            )
                        })}
                    style={(config.showLines[graphID][i][0]) ?
                        {
                            appearance: 'none',
                            display: 'inline-block',
                            width: 15, height: 15,
                            backgroundClip: 'content-box',
                            backgroundColor: cols[i][0],
                            cursor: 'pointer'
                        } : {
                            appearance: 'none',
                            display: 'inline-block',
                            width: 15, height: 15,
                            backgroundClip: 'content-box',
                            backgroundColor: 'white',
                            border: '3px solid ' + cols[i][0],
                            cursor: 'pointer'
                        }
                    }
                />
            </td>
            <td className={style.TC} key={'active-' + graphID + '-' + id}>
                <input
                    type="checkbox"
                    disabled={(signalType === 'Output') ? true : false}
                    checked={config.showLines[graphID][i][1]}
                    onChange={() => updateConfig({
                        showLines: config.showLines.toSpliced(
                            graphID, 1, config.showLines[graphID].toSpliced(
                                i, 1, config.showLines[graphID][i].toSpliced(
                                    1, 1, !config.showLines[graphID][i][1]
                                )
                            )
                        )
                    })}
                    style={(!(signalType === 'Output')) ?
                        ((config.showLines[graphID][i][1]) ?
                            {
                                appearance: 'none',
                                display: 'inline-block',
                                width: 15, height: 15,
                                backgroundClip: 'content-box',
                                backgroundColor: cols[i][1],
                                cursor: 'pointer'
                            } : {
                                appearance: 'none',
                                display: 'inline-block',
                                width: 15, height: 15,
                                backgroundClip: 'content-box',
                                backgroundColor: 'white',
                                border: '3px solid ' + cols[i][1],
                                cursor: 'pointer'
                            }
                        ) : {
                            appearance: 'none',
                            display: 'inline-block',
                            width: 15, height: 15,
                            backgroundClip: 'content-box',
                            backgroundColor: '#C0C0C0',
                            cursor: 'not-allowed'
                        }
                    }
                />
            </td>
            <td className={style.TC} key={'total-' + graphID + '-' + id}>
                <input
                    type="checkbox"
                    disabled={(signalType === 'Output') ? true : false}
                    checked={config.showLines[graphID][i][2]}
                    onChange={() => updateConfig({
                        showLines: config.showLines.toSpliced(
                            graphID, 1, config.showLines[graphID].toSpliced(
                                i, 1, config.showLines[graphID][i].toSpliced(
                                    2, 1, !config.showLines[graphID][i][2]
                                )
                            )
                        )
                    })}
                    style={(!(signalType === 'Output')) ?
                        ((config.showLines[graphID][i][2]) ?
                            {
                                appearance: 'none',
                                display: 'inline-block',
                                width: 15, height: 15,
                                backgroundClip: 'content-box',
                                backgroundColor: cols[i][2],
                                cursor: 'pointer'
                            } : {
                                appearance: 'none',
                                display: 'inline-block',
                                width: 15, height: 15,
                                backgroundClip: 'content-box',
                                backgroundColor: 'white',
                                border: '3px solid ' + cols[i][2],
                                cursor: 'pointer'
                            }
                        ) : {
                            appearance: 'none',
                            display: 'inline-block',
                            width: 15, height: 15,
                            backgroundClip: 'content-box',
                            backgroundColor: '#C0C0C0',
                            cursor: 'not-allowed'
                        }
                    }
                />
            </td>
        </tr>
    )
}

// eslint-disable-next-line max-lines-per-function
export default function GraphDisplayTable({ stage, lines, colours, graphID, config, setConfig }: HeatTableProps) {
    const ref = useRef<HTMLTableElement>(null);

    const [height, setHeight] = useState<number | string | undefined>('auto');
    useEffect(() => {
        if (config.showStages[graphID]) setHeight(ref.current?.getBoundingClientRect().height);
        else setHeight(0);
    }, [config.showStages, graphID]);

    const updateConfig = (update: Partial<GraphConfiguration1D>) => setConfig({ ...config, ...update });

    const cols: string[][] = [];
    var colsNum = 0;

    for (let i = 0; i < config.showLines[graphID].length; i++) {
        const temp: string[] = [];
        for (let k = 0; k < config.showLines[graphID][i].length; k++) {
            temp.push((colours[colsNum++] ?? "white"));
        }
        cols.push(temp);
    }

    function toggleColumn(position: number) {
        const newShowLines = config.showLines.toSpliced(
            graphID, 1, config.showLines[graphID].toSpliced(
                0, lines.length, ...lines.map((x, i) => config.showLines[graphID][i].toSpliced(position, 1, !config.showLines[graphID][i][position])
                )
            )
        );
        updateConfig({ showLines: newShowLines })
    }

    function toggleRow(lineID: number) {
        const newShowLines = config.showLines.toSpliced(
            graphID, 1, config.showLines[graphID].toSpliced(
                lineID, 1, config.showLines[graphID][lineID].toSpliced(
                    0, 3, !config.showLines[graphID][lineID][0], !config.showLines[graphID][lineID][1], !config.showLines[graphID][lineID][2]
                )
            )
        );
        updateConfig({ showLines: newShowLines })
    }
    return (
        <div className="flex flex-col justify-center items-center w-full">
            <div className="flex flex-row justify-center items-center w-full">
                <button
                    className={(config.showStages[graphID]) ? style.GRAPHBUTTONON : style.GRAPHBUTTONOFF}
                    onClick={() => updateConfig({ showStages: config.showStages.toSpliced(graphID, 1, !config.showStages[graphID]) })}
                >{stage}</button>
            </div>
            <div className={style.COLLAPSIBLE} style={{ height: height }}>
                <table ref={ref} >
                    <tbody>
                        <tr className={style.TR} key={'headers-' + graphID}>
                            <th
                                className={style.TD}
                                key={'heatLoadsHeader-' + graphID}
                            >Heat Loads</th>
                            <th
                                className={style.TD}
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleColumn(0)}
                                key={'passiveHeader-' + graphID}
                            >Passive</th>
                            <th
                                className={style.TD}
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleColumn(1)}
                                key={'activeHeader-' + graphID}
                            >Active</th>
                            <th
                                className={style.TD}
                                style={{ cursor: 'pointer' }}
                                onClick={() => toggleColumn(2)}
                                key={'totalHeader-' + graphID}
                            >Total</th>
                        </tr>
                        {lines.map(({ id, signalType }, i) =>
                            <LineSelectors
                                key={`line-selectors-${i}`}
                                config={config}
                                cols={cols}
                                id={id}
                                signalType={signalType}
                                i={i}
                                graphID={graphID}
                                updateConfig={updateConfig}
                                toggleRow={toggleRow}
                            />
                        )}
                        <tr className={style.TR} key={'totals-' + graphID}>
                            <td className={style.TD} key={'totals-name-' + graphID}>Total</td>
                            <td className={style.TC} key={'totals-passive-' + graphID}>
                                <input
                                    type="checkbox"
                                    disabled
                                    style={{
                                        appearance: 'none',
                                        display: 'inline-block',
                                        width: 15, height: 15,
                                        backgroundClip: 'content-box',
                                        backgroundColor: '#C0C0C0',
                                        cursor: 'not-allowed'
                                    }}
                                />
                            </td>
                            <td className={style.TC} key={'totals-active-' + graphID}>
                                <input
                                    type="checkbox"
                                    disabled
                                    style={{
                                        appearance: 'none',
                                        display: 'inline-block',
                                        width: 15, height: 15,
                                        backgroundClip: 'content-box',
                                        backgroundColor: '#C0C0C0',
                                        cursor: 'not-allowed'
                                    }}
                                />
                            </td>
                            <td className={style.TC} key={'totals-total-' + graphID}>
                                <input
                                    type="checkbox"
                                    checked={config.showTotalLines[graphID]}
                                    onChange={() => updateConfig({
                                        showTotalLines: config.showTotalLines.toSpliced(
                                            graphID, 1, !config.showTotalLines[graphID]
                                        )
                                    })}
                                    style={(config.showTotalLines[graphID]) ?
                                        {
                                            appearance: 'none',
                                            display: 'inline-block',
                                            width: 15, height: 15,
                                            backgroundClip: 'content-box',
                                            backgroundColor: "black",
                                            cursor: 'pointer'
                                        } : {
                                            appearance: 'none',
                                            display: 'inline-block',
                                            width: 15, height: 15,
                                            backgroundClip: 'content-box',
                                            backgroundColor: 'white',
                                            border: '3px solid black',
                                            cursor: 'pointer'
                                        }
                                    }
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
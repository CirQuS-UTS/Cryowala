"use client";

import style from "@/app/App.module.css";
import { useEffect, useRef, useState } from "react";
import { GraphConfiguration1D } from "@/app/calculate/sweep/page";

export type NoiseTableProps = {
    stages: string[],
    colours: string[],
    config: GraphConfiguration1D,
    setConfig: (config: GraphConfiguration1D) => void
};

type NoiseContributionSelectorsProps = {
    stage: string,
    i: number,
    config: GraphConfiguration1D,
    colours: string[],
    updateConfig: (update: Partial<GraphConfiguration1D>) => void
}

// eslint-disable-next-line max-lines-per-function
function NoiseContributionSelectors({ stage, i, config, colours, updateConfig }: NoiseContributionSelectorsProps) {
    return (
        <tr className={style.TR} key={'noiseCont-' + i}>
            <td className={style.TDN} key={'noiseContStage-' + i}>
                {stage}:
            </td>
            <td className={style.TCN} key={'noiseContValue-' + i}>
                <input
                    type="checkbox"
                    checked={config.noiseCont[i]}
                    onChange={() => updateConfig({
                        noiseCont: config.noiseCont.toSpliced(i, 1, !config.noiseCont[i])
                    })}
                    style={(config.noiseCont[i]) ?
                        {
                            appearance: 'none',
                            display: 'inline-block',
                            width: 15, height: 15,
                            backgroundClip: 'content-box',
                            backgroundColor: colours[i]
                        } : {
                            appearance: 'none',
                            display: 'inline-block',
                            width: 15, height: 15,
                            backgroundClip: 'content-box',
                            backgroundColor: 'white',
                            border: '3px solid ' + colours[i]
                        }
                    }
                />
            </td>
        </tr>
    )
}

type NoiseContributionProps = {
    config: GraphConfiguration1D,
    stages: string[],
    colours: string[],
    updateConfig: (update: Partial<GraphConfiguration1D>) => void
}

// eslint-disable-next-line max-lines-per-function
function NoiseContribution({ config, stages, colours, updateConfig }: NoiseContributionProps) {
    const noiseStages: string[] = ['RT', ...stages, "Total"];
    return (
        <div className="flex flex-col justify-center items-center w-full">
            <h1 style={{ textAlign: "center", fontWeight: "bold" }}>Noise Contribution</h1>
            <table className={style.TABLE}>
                <tbody>
                    {noiseStages.map((s, i) =>
                        <NoiseContributionSelectors
                            key={`noise-cont-select-${i}`}
                            stage={s}
                            i={i}
                            config={config}
                            colours={colours}
                            updateConfig={updateConfig}
                        />)}
                </tbody>
            </table>
        </div>
    )
}

// eslint-disable-next-line max-lines-per-function
export default function NoiseTable({ stages, colours, config, setConfig }: NoiseTableProps) {


    const ref = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | string | undefined>('auto');
    useEffect(() => {
        if (config.showNoiseRow) setHeight(ref.current?.getBoundingClientRect().height);
        else setHeight(0);
    }, [config.showNoiseRow]);

    const updateConfig = (update: Partial<GraphConfiguration1D>) => setConfig({ ...config, ...update });

    return (
        <div className="flex flex-col justify-center items-center w-full">
            <div className="flex flex-row justify-center items-center w-full">
                <button
                    className={(config.showNoiseRow) ? style.GRAPHBUTTONON : style.GRAPHBUTTONOFF}
                    onClick={() => updateConfig({ showNoiseRow: !config.showNoiseRow })}
                >Noise</button>
            </div>
            <div className={style.COLLAPSIBLE} style={{ height }}>
                <div ref={ref} className="flex flex-col justify-center items-center w-full">
                    <h1 style={{ textAlign: "center", fontWeight: "bold" }}>Noise Type</h1>
                    <table className={style.TABLE}>
                        <tbody>
                            <tr className={style.TR} key={'photons'}>
                                <td className={style.TDN} key={'photonsTitle'}>Noise Photons</td>
                                <td className={style.TCN} key={'photonsRadioButton'}>
                                    <input
                                        type="radio"
                                        value={0}
                                        checked={config.noiseType == 0 ? true : false}
                                        onChange={e => updateConfig({ noiseType: 0 })}
                                    />
                                </td>
                            </tr>
                            <tr className={style.TR} key={'voltage'}>
                                <td className={style.TDN} key={'voltageTitle'}>Noise Voltage</td>
                                <td className={style.TCN} key={'voltageRadioButton'}>
                                    <input
                                        type="radio"
                                        value={2}
                                        checked={config.noiseType == 2 ? true : false}
                                        onChange={e => updateConfig({ noiseType: 2 })}
                                    />
                                </td>
                            </tr>
                            <tr className={style.TR} key={'current'}>
                                <td className={style.TDN} key={'currentTitle'}>Noise Current</td>
                                <td className={style.TCN} key={'currentRadioButton'}>
                                    <input
                                        type="radio"
                                        value={1}
                                        checked={config.noiseType == 1 ? true : false}
                                        onChange={e => updateConfig({ noiseType: 1 })}
                                    />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <NoiseContribution
                        config={config}
                        stages={stages}
                        colours={colours}
                        updateConfig={updateConfig}
                    />
                </div>
            </div>
        </div>
    )
}
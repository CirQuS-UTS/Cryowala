import SelectInput from "./single_value/select"
import NumberInput from "./single_value/number";
import TextInput from "./single_value/text";
import { GraphConfiguration2D, GraphContour } from "@/app/calculate/sweep/page";
import { interpolatePlasma, interpolateViridis, interpolateInferno, interpolateMagma, interpolateCividis } from 'd3-scale-chromatic';
import { useState } from "react";

export type GraphControl2DProps = {
    stages: string[],
    config: GraphConfiguration2D,
    setConfig: (config: GraphConfiguration2D) => void,
    deleteConfig: () => void
}

type GraphControlProps = {
    stages: string[],
    config: GraphConfiguration2D,
    updateConfig: (update: Partial<GraphConfiguration2D>) => void,

}

// eslint-disable-next-line max-lines-per-function
function GraphControls({ stages, config, updateConfig }: GraphControlProps) {

    const colourSchemes: Record<string, (t: number) => string> = {
        'Plasma': interpolatePlasma,
        'Viridis': interpolateViridis,
        'Cividis': interpolateCividis,
        'Inferno': interpolateInferno,
        'Magma': interpolateMagma
    };

    const colourSchemeKeys = Object.keys(colourSchemes);
    var startColour: string = "Custom";
    colourSchemeKeys.forEach((k) => (colourSchemes[k] === config.colour) ? startColour = k : null);

    const [contourUpdate, setContourUpdate] = useState<GraphContour[]>(config.contours)
    const [customScale, setCustomScale] = useState<[number, number]>((config.scale == 'auto') ? [0.1, 10] : config.scale);

    const [stage, setStage] = useState(
        (config.target.type == "Heat Load" || config.target.type == "Temperature")
            ? config.target.target
            : stages[0]
    );
    const [nStage, setNStage] = useState(
        (config.target.type == "Noise")
            ? config.target.target
            : "Photons"
    )

    return (
        <div className="bg-gray-300 border border-gray-400 rounded-lg flex flex-col justify-center items-center py-2 gap-1">
            <div className="w-11/12">
                {/* Stage Selection */}
                <SelectInput
                    type='dropdown'
                    label='Graph Type'
                    options={["Heat Load", "Temperature", "Noise"]}
                    value={config.target.type}
                    onChange={value =>
                        (value == "Heat Load")
                            ? updateConfig({ target: { type: "Heat Load", target: stage } })
                            : (value == "Temperature")
                                ? updateConfig({ target: { type: "Temperature", target: stage } })
                                : (value == "Noise")
                                    ? updateConfig({ target: { type: "Noise", target: nStage } })
                                    : null
                    }
                    rounded
                    shadow
                />
                <SelectInput
                    type='dropdown'
                    label='Display Stage'
                    options={[...stages]}
                    value={config.target.target}
                    onChange={value => {
                        updateConfig({ target: { type: config.target.type, target: value } });
                        setStage(value);
                    }}
                    rounded
                    shadow
                    disable={(config.target.type == "Noise") ? true : false}
                />
                <SelectInput
                    type='dropdown'
                    label='Noise Type'
                    options={['Photons', 'Current', 'Voltage']}
                    value={config.target.target}
                    onChange={value => {
                        updateConfig({ target: { type: "Noise", target: value } });
                        setNStage(value);
                    }}
                    rounded
                    shadow
                    disable={(config.target.type == "Noise") ? false : true}
                />
                {/* Colour Scheme Selection */}
                <SelectInput
                    type='dropdown'
                    label='Colour Scheme'
                    options={Object.keys(colourSchemes)}
                    value={startColour}
                    onChange={value => updateConfig({ colour: colourSchemes[value] })}
                    rounded
                    shadow
                />
            </div>
            {/* Contour Lines Definition */}
            {/* eslint-disable-next-line max-lines-per-function */}
            {contourUpdate.map((c, i) => {
                return <div key={`contour-lines-${i}`} className="w-11/12 flex flex-col justify-center items-center gap-1">
                    <h1 className="font-bold">Contour {i + 1}</h1>
                    <NumberInput
                        label="Level"
                        value={c.level}
                        onChange={value => setContourUpdate(contourUpdate.toSpliced(i, 1, { level: value, colour: c.colour }))}
                        rounded
                        shadow
                    />
                    <TextInput
                        label={"Colour"}
                        value={c.colour}
                        onChange={value => setContourUpdate(contourUpdate.toSpliced(i, 1, { level: c.level, colour: value }))}
                        rounded
                        shadow
                    />
                    <div className="flex flex-row w-full">
                        <button
                            className="w-2/3 p-1 text-white bg-sky-400 rounded-lg text-zinc-800 border border-zinc-800"
                            onClick={() => updateConfig({ contours: config.contours.toSpliced(i, 1, c) })}
                        >Update</button>
                        <button
                            className="w-2/3 p-1 text-white bg-sky-400 rounded-lg text-zinc-800 border border-zinc-800"
                            onClick={() => {
                                updateConfig({ contours: config.contours.toSpliced(i, 1) });
                                setContourUpdate(contourUpdate.toSpliced(i, 1));
                            }}
                        >Delete</button>
                    </div>
                </div>
            })}
            {/* Add a contour */}
            <button
                className="w-2/3 p-1 text-white bg-sky-400 rounded-lg text-zinc-800 border border-zinc-800"
                onClick={() => {
                    updateConfig({ contours: config.contours.concat({ level: 1e-1, colour: 'white' }) });
                    setContourUpdate(contourUpdate.concat({ level: 1e-1, colour: 'white' }));
                }}
            >Add Contour</button>
            {/* Auto Scale On/Of */}
            <div className="flex flex-row text-center justify-center font-bold">
                <h1 className="pr-2">Automatic Scaling: </h1>
                <input
                    type={"checkbox"}
                    checked={config.scale == "auto"}
                    onChange={() => updateConfig({ scale: (config.scale != "auto") ? "auto" : customScale })}
                />
            </div>
            {/* Custom Scale Definition */}
            {(config.scale != "auto") && <div className="w-11/12 flex flex-col justify-center items-center gap-1">
                <h1>Custom Scaling</h1>
                <NumberInput
                    label="Minimum"
                    value={customScale[0]}
                    onChange={value => setCustomScale([value, Number(customScale[1])])}
                    rounded
                    shadow
                />
                <NumberInput
                    label="Maximum"
                    value={customScale[1]}
                    onChange={value => setCustomScale([Number(customScale[0]), value])}
                    rounded
                    shadow
                />
                <button
                    className="w-2/3 p-1 text-white bg-sky-400 rounded-lg text-zinc-800 border border-zinc-800"
                    onClick={() => updateConfig({ scale: customScale })}
                >Update Scale</button>
            </div>}
        </div>
    )
}

// eslint-disable-next-line max-lines-per-function
export default function GraphControl2D({ stages, config, setConfig, deleteConfig }: GraphControl2DProps) {

    const updateConfig = (update: Partial<GraphConfiguration2D>) => setConfig({ ...config, ...update });

    return (
        <div className="flex text-center justify-center items-center">
            <details className="w-full">
                <summary className="relative text-white bg-zinc-800 p-2 rounded-lg cursor-pointer">
                    {/* Graph Name (based on stage displayed) */}
                    <h1 className="inline">{config.target.type} {config.target.target} Graph</h1>
                    {/* Delete Graph */}
                    <button
                        className="absolute right-2 bg-red-600 px-2 rounded-lg"
                        onClick={deleteConfig}
                    >X</button>
                </summary>
                <GraphControls
                    stages={stages}
                    config={config}
                    updateConfig={updateConfig}
                />
            </details>
        </div>
    )
}
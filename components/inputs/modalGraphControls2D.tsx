import SelectInput from "./single_value/select"
import NumberInput from "./single_value/number";
import TextInput from "./single_value/text";
import { GraphConfiguration2D } from "@/app/calculate/sweep/page";
import { interpolatePlasma, interpolateViridis, interpolateInferno, interpolateMagma, interpolateCividis } from 'd3-scale-chromatic';
import { useState } from "react";
import { Add2DGraphModal } from "@/app/calculate/sweep/page";

export type ModalGraphControl2DProps = {
    modalState: Add2DGraphModal,
    stages: string[],
}

// eslint-disable-next-line max-lines-per-function
export default function ModalGraphControl2D({ modalState, stages }: ModalGraphControl2DProps) {

    const updateModalState = (update: Partial<GraphConfiguration2D>) => modalState.setModal({
        active: modalState.modal.active,
        graph: { ...modalState.modal.graph, ...update }
    });

    const colourSchemes: Record<string, (t: number) => string> = {
        'Plasma': interpolatePlasma,
        'Viridis': interpolateViridis,
        'Cividis': interpolateCividis,
        'Inferno': interpolateInferno,
        'Magma': interpolateMagma
    };

    const colourSchemeKeys = Object.keys(colourSchemes);
    var startColour: string = "Custom";
    colourSchemeKeys.forEach((k) => (colourSchemes[k] === modalState.modal.graph.colour) ? startColour = k : null);

    const [customScale, setCustomScale] = useState<[number, number]>([0.1, 10]);

    const [stage, setStage] = useState(
        (modalState.modal.graph.target.type == "Heat Load" || modalState.modal.graph.target.type == "Temperature")
            ? modalState.modal.graph.target.target
            : stages[0]
    );
    const [nStage, setNStage] = useState(
        (modalState.modal.graph.target.type == "Noise")
            ? modalState.modal.graph.target.target
            : "Photons"
    )

    return (
        <div className="bg-gray-400 rounded-lg flex flex-col justify-center items-center text-center py-2 gap-1">
            <div className="w-full">
                {/* Stage Selection */}
                <SelectInput
                    type='dropdown'
                    label='Graph Type'
                    options={["Heat Load", "Temperature", "Noise"]}
                    value={modalState.modal.graph.target.type}
                    onChange={value =>
                        (value == "Heat Load")
                            ? updateModalState({ target: { type: "Heat Load", target: stage } })
                            : (value == "Temperature")
                                ? updateModalState({ target: { type: "Temperature", target: stage } })
                                : (value == "Noise")
                                    ? updateModalState({ target: { type: "Noise", target: nStage } })
                                    : null
                    }
                    rounded
                    shadow
                />
                <SelectInput
                    type='dropdown'
                    label='Display Stage'
                    options={[...stages]}
                    value={modalState.modal.graph.target.target}
                    onChange={value => {
                        updateModalState({ target: { type: modalState.modal.graph.target.type, target: value } });
                        setStage(value);
                    }}
                    rounded
                    shadow
                    disable={(modalState.modal.graph.target.type == "Noise") ? true : false}
                />
                <SelectInput
                    type='dropdown'
                    label='Noise Type'
                    options={['Photons', 'Current', 'Voltage']}
                    value={modalState.modal.graph.target.target}
                    onChange={value => {
                        updateModalState({ target: { type: "Noise", target: value } });
                        setNStage(value);
                    }}
                    rounded
                    shadow
                    disable={(modalState.modal.graph.target.type == "Noise") ? false : true}
                />
                {/* Colour Scheme Selection */}
                <SelectInput
                    type='dropdown'
                    label='Colour Scheme'
                    options={Object.keys(colourSchemes)}
                    value={startColour}
                    onChange={value => updateModalState({ colour: colourSchemes[value] })}
                    rounded
                    shadow
                />
            </div>
            {/* Contour Lines Definition */}
            {/* eslint-disable-next-line max-lines-per-function */}
            {modalState.modal.graph.contours.map((c, i) => {
                return <div key={`contour-lines-${i}`} className="w-11/12 flex flex-col justify-center items-center gap-1">
                    <h1 className="font-bold">Contour {i + 1}</h1>
                    <NumberInput
                        label="Level"
                        value={c.level}
                        onChange={value => updateModalState({ contours: modalState.modal.graph.contours.toSpliced(i, 1, { level: value, colour: c.colour }) })}
                        rounded
                        shadow
                    />
                    <TextInput
                        label={"Colour"}
                        value={c.colour}
                        onChange={value => updateModalState({ contours: modalState.modal.graph.contours.toSpliced(i, 1, { level: c.level, colour: value }) })}
                        rounded
                        shadow
                    />
                    <div className="flex flex-row justify-center items-center w-full">
                        <button
                            className="w-2/3 p-1 text-white bg-red-600 rounded-lg text-zinc-800 border border-zinc-800"
                            onClick={() => {
                                updateModalState({ contours: modalState.modal.graph.contours.toSpliced(i, 1) });
                            }}
                        >Delete</button>
                    </div>
                </div>
            })}
            {/* Add a contour */}
            <button
                className="w-2/3 p-1 text-white bg-sky-400 rounded-lg text-zinc-800 border border-zinc-800"
                onClick={() => {
                    updateModalState({ contours: modalState.modal.graph.contours.concat({ level: 1e-1, colour: 'white' }) });
                }}
            >Add Contour</button>
            {/* Auto Scale On/Of */}
            <div className="flex flex-row text-center justify-center font-bold">
                <h1 className="pr-2">Automatic Scaling: </h1>
                <input
                    type={"checkbox"}
                    checked={modalState.modal.graph.scale == "auto"}
                    onChange={() => updateModalState({ scale: (modalState.modal.graph.scale != "auto") ? "auto" : customScale })}
                />
            </div>
            {/* Custom Scale Definition */}
            {(modalState.modal.graph.scale != "auto") && <div className="w-11/12 flex flex-col justify-center items-center gap-1">
                <h1>Custom Scaling</h1>
                <NumberInput
                    label="Minimum"
                    value={customScale[0]}
                    onChange={value => {

                        updateModalState({ scale: [value, Number(customScale[1])] });
                        setCustomScale([value, Number(customScale[1])]);
                    }}
                    rounded
                    shadow
                />
                <NumberInput
                    label="Maximum"
                    value={customScale[1]}
                    onChange={value => {

                        updateModalState({ scale: [Number(customScale[0]), value] });
                        setCustomScale([Number(customScale[0]), value]);
                    }}
                    rounded
                    shadow
                />
            </div>}
        </div>
    );
}
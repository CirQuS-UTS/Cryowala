import { Diameters, ThermalConductivityValue, BivariateCableData, TempEstimationPoint } from "./types";

export type FridgeConfig = {
    stages: StageConfig[];
    cables: CableConfig[];
    lines: LineConfig[];
    segments: SegmentConfig[];
    temperatureEstimationData: TempEstimationPoint[];
};

export type StageId = string; // e.g. "50K", "MXC" or "Still"
export type StageConfig = {
    id: StageId; // This is also the name of the stage.

    index: number; // Priority of the stage 0 is the closest to room temperature.

    temperature: number;
    coolingPower: number;
};

export type LineId = string; // Normally in the format of "LineType-LineNo" e.g. "Flux-1", "Drive-2" or "Output-3"
export type LineConfig = {
    id: string; // This is also the name of the line.

    signalType: "Drive" | "Flux" | "Output";
    currentType: "AC" | "DC";

    signalPower: number; // AC
    signalFrequency: number; // AC
    inputCurrent: number; // DC

    count: number; // Number of lines of this type.

    // This type should have a method to return the signalPower
    // signalPower calculated as '[1e-3*10**(-75/10)*10**((sum(config_drive)+10)/20)]'
    // inputCurrent calculated as '[2e-3*10**(sum(config_flux)/20)]'
};

export type CableId = string; // Normally in the format "diameter-material-material". e.g. "219-CuNi-CuNi" or "119-AgCuNi-CuNi"
export type CableConfig = {
    id: CableId; // This is also the name of the cable,

    diameters: Diameters;
    thermalConductivityValue: ThermalConductivityValue;
    rho: number;
    bivariateCableData: BivariateCableData[];

    // This type should have a method to return the thermalConductivity.
    //   Calculated as '[thermalConductivityValue, (diameters[2] * 100_000).toString()]'
};

export const ThermalisationOptions = ["auto", "on", "off"] as const;
export type Thermalisation = typeof ThermalisationOptions[number];
export type SegmentConfig = {
    cableId: CableId;
    lineId: LineId;
    stageId: StageId;

    attenuation: number;
    length: number;

    innerThermalisation: Thermalisation;
    dielectricThermalisation: Thermalisation;
    outerThermalisation: Thermalisation;

    // This type should have a method to return the thermalScheme.
    //   Calculated as 'attenuation > 0' for each segment.
}

export type LineLoadOutput = {
    output: Record<string, number>,
    line: LineConfig,
    type: "Passive" | "Active" | "Total";
}

export type NoiseData2DSweep = {
    photons: number,
    voltage: number,
    current: number
}

export type SweepResults2D = {
    shape: {
        x: number[],
        y: number[]
    },
    heat_loads: Record<string, number>[][],
    temperatures: Record<string, number>[][],
    noise: NoiseData2DSweep[][]
}
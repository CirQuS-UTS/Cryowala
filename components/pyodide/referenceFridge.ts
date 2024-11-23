import { CryoModelInterface, ThermalConductivity } from "./types";

export const fridge = {
    stages: [
        {
            name: "50K",
            temperature: 46,
        },
        {
            name: "4K",
            temperature: 3.94,
        },
        {
            name: "Still",
            temperature: 1.227,
        },
        {
            name: "CP",
            temperature: 0.15,
        },
        {
            name: "MXC",
            temperature: 0.02,
        }
    ],

    driveCable: {
        type: "219-SS-SS",
        diameters: [0.00051, 0.00167, 0.00219] as [number, number, number],
        lengths: [0.236, 0.337, 0.3, 0.15, 0.222],
        thermal_conductivity: [4.3e-5, '219'] as ThermalConductivity,
        attentuationPoints: [1.9, 2.6, 5.9, 8.3, 11.7] as [number, number, number, number, number],
    },

    fluxCable: {
        type: "219-CuNi-CuNi",
        diameters: [0.00051, 0.00167, 0.00219] as [number, number, number],
        lengths: [0.236, 0.337, 0.3, 0.15, 0.222],
        thermal_conductivity: [6.30e-5, '219'] as ThermalConductivity,
        rho: 37.5e-8,
    },

    outputUpperCable: {
        type: "119-AgCuNi-CuNi",
        diameters: [0.287e-3, 0.94e-3, 1.19e-3] as [number, number, number],
        lengths: [0.236, 0.337, 0.3, 0.15, 0.222],
        thermal_conductivity: [1.04e-4, '119'] as ThermalConductivity,

    },

    outputLowerCable: {
        type: "119-NbTi-NbTi",
        diameters: [0.287e-3, 0.94e-3, 1.19e-3] as [number, number, number],
        lengths: [0.2, 0.290, 0.25, 0.170, 0.140],
        thermal_conductivity: [7.54e-6, '119'] as ThermalConductivity,
    },

};

export const passiveDriveThermalScheme: any = [
    [false, true, false, true, true],
    [false, true, false, true, true],
    [true, true, true, true, true]
];

export const passiveFluxThermalScheme: any = [
    [true, true, false, false, true],
    [true, true, false, false, true],
    [true, true, true, true, true]
];

export const thermalSchemeOutput: any = [
    [false, true, false, false, true],
    [false, true, false, false, true],
    [true, true, true, true, true]
];

export const activeDriveAttenuation = [0, 10, 0, 20, 30];
export const activeFluxAttenuation = [6, 14, 0, 0, 0];

const stageCoolingPowers: { [key: string]: number } = {
    "50K": 10,
    "4K": 0.5,
    "Still": 30e-3,
    "CP": 300e-6,
    "MXC": 20e-6,
};

export const referencePassiveDrive = (model: CryoModelInterface) => {
    const results = model.passiveLoad(
        fridge.stages.map(stage => stage.name),
        fridge.driveCable.diameters,
        fridge.driveCable.lengths,
        fridge.stages.map(stage => stage.temperature),
        [fridge.driveCable.thermal_conductivity, [0, '219'], fridge.driveCable.thermal_conductivity],
        passiveDriveThermalScheme,
    );

    for (const stage of Object.keys(stageCoolingPowers)) {
        results[stage] *= 14;
        results[stage] /= stageCoolingPowers[stage];
    }

    return results;
}

export const referencePassiveFlux = (model: CryoModelInterface) => {
    const results = model.passiveLoad(
        fridge.stages.map(stage => stage.name),
        fridge.fluxCable.diameters,
        fridge.fluxCable.lengths,
        fridge.stages.map(stage => stage.temperature),
        [fridge.fluxCable.thermal_conductivity, [0, '219'], fridge.fluxCable.thermal_conductivity],
        passiveFluxThermalScheme,
    );

    for (const stage of Object.keys(stageCoolingPowers)) {
        results[stage] *= 14;
        results[stage] /= stageCoolingPowers[stage];
    }

    return results;
}

// eslint-disable-next-line max-lines-per-function
export const referencePassiveOutput = (model: CryoModelInterface) => {
    const passiveOutputLower = model.passiveLoad(
        fridge.stages.map(stage => stage.name),
        fridge.outputLowerCable.diameters,
        fridge.outputLowerCable.lengths,
        fridge.stages.map(stage => stage.temperature),
        [fridge.outputLowerCable.thermal_conductivity, [0, '119'], fridge.outputLowerCable.thermal_conductivity],
        thermalSchemeOutput
    );

    const passiveOutputUpper = model.passiveLoad(
        fridge.stages.map(stage => stage.name),
        fridge.outputUpperCable.diameters,
        fridge.outputUpperCable.lengths,
        fridge.stages.map(stage => stage.temperature),
        [fridge.outputUpperCable.thermal_conductivity, [0, '119'], fridge.outputUpperCable.thermal_conductivity],
        thermalSchemeOutput
    );

    const results: Record<string, number> = {};
    for (let i = 0; i < fridge.stages.length; i++) {
        const stage = fridge.stages[i].name;
        if (i < 2) {
            results[stage] = passiveOutputUpper[stage];
        } else {
            results[stage] = passiveOutputLower[stage];
        }
    }

    for (const stage of Object.keys(stageCoolingPowers)) {
        results[stage] *= 4;
        results[stage] /= stageCoolingPowers[stage];
    }

    return results;
}

// eslint-disable-next-line max-lines-per-function
export const referenceActiveDrive = (model: CryoModelInterface) => {
    const baseFrequencyPointsForCableAttenuation = [0.5, 1, 5, 10, 20]
    const attSum = activeDriveAttenuation.reduce((a, b) => a + b, 0);
    const results = model.activeLoadAC(
        fridge.stages.map(stage => stage.name),
        fridge.driveCable.lengths,
        activeDriveAttenuation,
        fridge.driveCable.attentuationPoints.map((attenutationPoint, i) => {
            return {
                frequency: baseFrequencyPointsForCableAttenuation[i],
                attenuation: attenutationPoint
            }
        }),
        1e-3 * Math.pow(10, -75 / 10) * Math.pow(10, (attSum + 10) / 20),
        6
    );

    for (const stage of Object.keys(results)) {
        results[stage] *= 14 * 0.33;
        results[stage] /= stageCoolingPowers[stage];
    }

    return results;
}

export const referenceActiveFlux = (model: CryoModelInterface) => {
    const attSum = activeFluxAttenuation.reduce((a, b) => a + b, 0);
    const results = model.activeLoadDC(
        fridge.stages.map(stage => stage.name),
        fridge.fluxCable.diameters,
        fridge.fluxCable.lengths,
        activeFluxAttenuation,
        2e-3 * Math.pow(10, attSum / 20),
        fridge.fluxCable.rho,
    );

    for (const stage of Object.keys(results)) {
        results[stage] *= 14 * 1;
        results[stage] /= stageCoolingPowers[stage];
    }

    return results;
}
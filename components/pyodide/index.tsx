/* eslint-disable @next/next/no-before-interactive-script-outside-document */
"use client"

import {
    CryoModelInterface,
    ActiveLoadACFn,
    PassiveLoadFn,
    ActiveLoadDCFn,
    DriveNoiseFn,
    FluxNoiseFn,
    CableAttenuationFn,
    ApplyTStagesFn,
    SweepModelInnerOutput,
    SweepModelInnerFn,
    CableAttGenerationFn,
    NoisePhotonsFn,
    NoiseCurrentFn,
    NoiseVoltageFn,
    SweepModelOuterFn,
    ConstraintGenerationFn,
    SpecificConstraintGenerationFn,
    BivariateCableData
} from "./types";
import { LineLoadOutput } from "@/components/pyodide/fridge.d"
import { PythonRuntime, usePythonRuntime } from "@/lib/pythonrt";

function escapedJsonStringify(obj: any): string {
    return JSON.stringify(obj).replace(/"/g, '\\"');
}

function javascriptToPython(data: any): string {
    // Note(Mitch): This switch could just be replaced with the default case,
    // but it makes the generated code look nicer if we have direct mappings for the primitive data types.
    switch (typeof data) {
        case "number":
            return escapedJsonStringify(data)
        case "string":
            return `"${data}"`;
        case "boolean":
            return data ? "True" : "False";
        default:
            return `json.loads("${escapedJsonStringify(data)}")`;
    }

}

export class CryoModel extends PythonRuntime implements CryoModelInterface {
    // Note(Mitch): These functions are blocking operation since you can wrap it as async on your own.

    // NOTE(Mitch): The 'loading' property is here to ensure backwards compatibility with the previous implementation.
    // TODO(Mitch): Remove the 'loading' property and use the 'loaded' property instead.
    get loading(): boolean {
        return !this.loaded;
    }

    // NOTE(Mitch): The 'isReady' function is here to ensure backwards compatibility with the previous implementation.
    // TODO(Mitch): Remove the 'isReady' function and use the 'ready' property instead.
    isReady(): boolean {
        return this.ready;
    }

    // NOTE(Mitch): The 'getStatus' function is here to ensure backwards compatibility with the previous implementation.
    // TODO(Mitch): Remove the 'getStatus' function and use the 'ready' property instead.
    getStatus(): { ready: boolean, reason: string } {
        if (this.isReady()) {
            return { ready: true, reason: "ready" };
        } else if (!this.loaded) {
            return { ready: false, reason: "loading" };
        } else if (this.error) {
            return { ready: false, reason: "error: " + this.error };
        } else {
            return { ready: false, reason: "unknown error" };
        }
    }

    cableAttenuation: CableAttenuationFn = (bivariate_cable_points: BivariateCableData[], frequency: number) => {
        const jsToPy = javascriptToPython;

        const frequencyPoints = bivariate_cable_points.map((point) => point.frequency);
        const attenuationPoints = bivariate_cable_points.map((point) => point.attenuation);

        const code = `
            from CryowalaCore import param_functions
            import json
            param_functions.c_att_generator(zip(${jsToPy(frequencyPoints)},${jsToPy(attenuationPoints)}))(${jsToPy(frequency)})`;

        return this.run(code);
    }

    passiveLoad: PassiveLoadFn = (stages, diameters, lengths, stage_temperatures, thermal_conductivities, thermal_schemes) => {
        const jsToPy = javascriptToPython;

        const code = `
        from CryowalaCore import model_functions, param_functions
        import json
        model_functions.passive_load(
            stage_labels=${jsToPy(stages)},
            diameters=${jsToPy(diameters)},
            lengths=${jsToPy(lengths)},
            therm_cond=[param_functions.tc_coaxco(tc[0], tc[1]) for tc in ${jsToPy(thermal_conductivities)}],
            therm_scheme=${jsToPy(thermal_schemes)},
            stage_temps=${jsToPy(stage_temperatures)}
        ).to_json(double_precision=15)`;

        return this.runJSON(code);
    }

    activeLoadAC: ActiveLoadACFn = (stages, lengths, attentuation, bivariate_cable_points, signalPower, signalFrequency) => {
        const jsToPy = javascriptToPython;

        const frequencyPoints = bivariate_cable_points.map((point) => point.frequency);
        const attenuationPoints = bivariate_cable_points.map((point) => point.attenuation);

        const code = `
        from CryowalaCore import model_functions, param_functions
        import json
        model_functions.active_load_AC(
            stage_labels=${jsToPy(stages)},
            signal_p=${jsToPy(signalPower)},
            signal_f=${jsToPy(signalFrequency)},
            att=${jsToPy(attentuation)},
            cable_att=param_functions.c_att_generator(zip(${jsToPy(frequencyPoints)},${jsToPy(attenuationPoints)})),
            lengths=${jsToPy(lengths)}
        ).to_json(double_precision=15)`;

        return this.runJSON(code);
    }

    activeLoadDC: ActiveLoadDCFn = (stages, diameters, lengths, attentuations, input_current, cable_rho) => {
        const jsToPy = javascriptToPython;

        const code = `
        from CryowalaCore import model_functions
        import json
        model_functions.active_load_DC(
            i_in=${jsToPy(input_current)},
            stage_labels=${jsToPy(stages)},
            att=${jsToPy(attentuations)},
            cable_rho=${jsToPy(cable_rho)},
            lengths=${jsToPy(lengths)},
            diameters=${jsToPy(diameters)}
        ).to_json(double_precision=15)`;

        return this.runJSON(code);
    }

    driveNoise: DriveNoiseFn = (stages, lengths, stage_temperatures, attentuations, bivariate_cable_points, frequency) => {
        const jsToPy = javascriptToPython;

        const frequencyPoints = bivariate_cable_points.map((point) => point.frequency);
        const attenuationPoints = bivariate_cable_points.map((point) => point.attenuation);

        const code = `
        from CryowalaCore import model_functions, param_functions
        import json
        model_functions.drive_noise(
            f=${jsToPy(frequency * 1e9)},
            stage_labels=${jsToPy(stages)},
            stage_temps=${jsToPy(stage_temperatures)},
            att=${jsToPy(attentuations)},
            cable_att=[param_functions.c_att_generator(zip(${jsToPy(frequencyPoints)},${jsToPy(attenuationPoints)}))(${frequency}) * length for length in ${jsToPy(lengths)}],
            lengths=${jsToPy(lengths)}
        ).to_json(double_precision=15)`;

        return this.runJSON(code);
    }

    fluxNoise: FluxNoiseFn = (stages, lengths, stage_temperatures, attentuations, bivariate_cable_points, frequency) => {
        const jsToPy = javascriptToPython;

        const frequencyPoints = bivariate_cable_points.map((point) => point.frequency);
        const attenuationPoints = bivariate_cable_points.map((point) => point.attenuation);

        const code = `
        from CryowalaCore import model_functions, param_functions
        import json
        model_functions.flux_noise(
            f=${jsToPy(frequency * 1e9)},
            stage_labels=${jsToPy(stages)},
            stage_temps=${jsToPy(stage_temperatures)},
            att=${jsToPy(attentuations)},
            cable_att=[param_functions.c_att_generator(zip(${jsToPy(frequencyPoints)},${jsToPy(attenuationPoints)}))(${frequency}) * length for length in ${jsToPy(lengths)}],
            lengths=${jsToPy(lengths)}
        ).to_json(double_precision=15)`;

        return this.runJSON(code);
    }

    applyBoundedTStages: ApplyTStagesFn = (heatLoads: number[]) => {
        const heatLoadLimits: { stage: string, lowerLimit: number, upperLimit: number }[] = [
            {
                stage: "50K",
                lowerLimit: 0,
                upperLimit: 5
            },
            {
                stage: "4K",
                lowerLimit: 0,
                upperLimit: 1
            },
            {
                stage: "Still",
                lowerLimit: 1e-2,
                upperLimit: 5e-2
            },
            {
                stage: "CP",
                lowerLimit: 0,
                upperLimit: 1e-3
            },
            {
                stage: "MXC",
                lowerLimit: 0,
                upperLimit: 8e-4
            },
        ];

        // only works for 5 stage fridge where the middle stage is the still stage.
        const heatLoadsLocal = heatLoads.map((h, i) => (i == 2) ? Math.max(heatLoads[i], 3e-2) : h);

        const errors: string[] = [];

        for (let i = 0; i < heatLoadLimits.length; i++) {
            if (
                heatLoadsLocal[i] < heatLoadLimits[i].lowerLimit ||
                heatLoadsLocal[i] > heatLoadLimits[i].upperLimit
            ) {
                errors.push(
                    `Heat Load ${heatLoadsLocal[i]} exceeds the range ` +
                    `[${heatLoadLimits[i].lowerLimit},` +
                    ` ${heatLoadLimits[i].upperLimit}]` +
                    ` for stage ${heatLoadLimits[i].stage}\n`
                )
            };
        }

        if (errors.length > 0) {
            console.error(errors.join(''));
            return this.nanValueArray(heatLoads);
        }

        return this.applyTStages(heatLoadsLocal)
    }

    // eslint-disable-next-line max-lines-per-function
    applyTStages: ApplyTStagesFn = (heatLoads: number[]) => {
        const jsToPy = javascriptToPython;
        const code = `
            from CryowalaCore import param_functions
            import json

            total = []
            heat_loads = ${jsToPy(heatLoads)}
        
            total.append(param_functions.T_funcs(0, heat_loads))
            total.append(param_functions.T_funcs(1, heat_loads))
            total.append(param_functions.T_funcs(2, heat_loads))
            total.append(param_functions.T_funcs(3, heat_loads))
            total.append(param_functions.T_funcs(4, heat_loads))
    
            json.dumps(total)
            `
        return this.runJSON(code);
    }

    // eslint-disable-next-line max-lines-per-function
    sweepModelInner: SweepModelInnerFn = (lines: LineLoadOutput[], c_p: number[]) => {
        const heatLoads: number[][] = [];
        const cpHeatLoads: number[][] = [];
        const temperatures: number[][] = [];

        for (let k = 0; k < lines.length; k++) {
            const values: number[] = [];
            for (let j in lines[k].output) {
                values.push(lines[k].output[j])
            }
            heatLoads.push(values);
            const divValues: number[] = [];
            for (let m = 0; m < values.length; m++) {
                divValues.push(values[m] / c_p[m])
            }
            cpHeatLoads.push(divValues);
        }

        const absHeatVals: number[][] = [];
        const heatVals: number[][] = [];

        for (let n = 0; n < heatLoads[0].length; n++) {
            const stageAbsHeatValues: number[] = [];
            const stageHeatValues: number[] = [];
            for (let o = 0; o < lines.length; o++) {
                stageAbsHeatValues.push(heatLoads[o][n]);
                stageHeatValues.push(cpHeatLoads[o][n]);
            }
            absHeatVals.push(stageAbsHeatValues);
            heatVals.push(stageHeatValues);
        }

        // generate temperature values
        const tempVals: number[][] = [];

        for (let t = 0; t < cpHeatLoads.length; t++) {
            temperatures.push(this.applyBoundedTStages(heatLoads[t]))
        }

        const totalNoise: number[] = [];
        for (let n = 0; n < heatLoads[0].length; n++) {
            const stageTempValues: number[] = [];
            var stageNoiseTotal: number = 0;
            for (let o = 0; o < lines.length; o++) {
                stageTempValues.push(temperatures[o][n]);
                stageNoiseTotal += heatLoads[o][n];
            }
            tempVals.push(stageTempValues);
            totalNoise.push(stageNoiseTotal);
        }

        tempVals.push(this.applyBoundedTStages(totalNoise));

        const output: SweepModelInnerOutput = {
            absHeatValues: absHeatVals,
            heatValues: heatVals,
            tempValues: tempVals
        }

        return output;
    }

    cableAttGeneration: CableAttGenerationFn = (bivariate_cable_points, frequency) => {
        const jsToPy = javascriptToPython;

        const frequencyPoints = bivariate_cable_points.map((point) => point.frequency);
        const attenuationPoints = bivariate_cable_points.map((point) => point.attenuation);

        const code = `
        from CryowalaCore import model_functions, param_functions
        import json
        cableAtt = param_functions.c_att_generator(
            zip(${jsToPy(frequencyPoints)},${jsToPy(attenuationPoints)})
        )(${frequency})
        json.dumps(cableAtt)`;

        return this.runJSON(code);
    }

    nanValueArray(tempVals: number[], addRT?: boolean): number[] {
        const nanArr = tempVals.map(() => NaN);
        if (addRT) nanArr.push(NaN);
        return nanArr;
    }

    filterRecord(record: Record<string, number>, filter: boolean[]): Record<string, number> {
        const result: Record<string, number> = {};
        const keys = Object.keys(record);
        for (var k = 0; k < keys.length; k++) {
            result[keys[k]] = (filter[k]) ? NaN : record[keys[k]];
        }
        return result;
    }

    getNaNValuePositions(temperatures: number[]): [number[], boolean[]] {
        const isNanVal: boolean[] = [false];

        const temperaturesNoNaN = temperatures.map((t) => {
            if (isNaN(t)) {
                isNanVal.push(true);
                return 1;
            } else {
                isNanVal.push(false);
                return t;
            }
        })

        return [temperaturesNoNaN, isNanVal];
    }

    noisePhotons: NoisePhotonsFn = (temperatures: number[], config: number[], cable_att: number[], lengths: number[], stages: string[], frequency: number) => {
        const jsToPy = javascriptToPython;

        const [temperaturesNoNaN, isNanVal] = this.getNaNValuePositions(temperatures);

        const code = `
        from CryowalaCore import param_functions
        import json
        model_functions.noise_photons(
            temp=${jsToPy(temperaturesNoNaN)},
            att=${jsToPy(config)},
            cable_att=${jsToPy(cable_att)},
            lengths=${jsToPy(lengths)},
            stage_labels=${jsToPy(stages)},
            f=${jsToPy(frequency * 1e9)}
        ).to_json(double_precision=15)`;
        return this.filterRecord(this.runJSON(code), isNanVal);
    }

    noiseCurrent: NoiseCurrentFn = (temperatures: number[], config: number[], cable_att: number[], lengths: number[], stages: string[], frequency: number) => {
        const jsToPy = javascriptToPython;

        const [temperaturesNoNaN, isNanVal] = this.getNaNValuePositions(temperatures);

        const code = `
        from CryowalaCore import param_functions
        import json
        model_functions.noise_current(
            temp=${jsToPy(temperaturesNoNaN)},
            att=${jsToPy(config)},
            cable_att=${jsToPy(cable_att)},
            lengths=${jsToPy(lengths)},
            stage_labels=${jsToPy(stages)},
            f=${jsToPy(frequency * 1e9)}
        ).to_json(double_precision=15)`;
        return this.filterRecord(this.runJSON(code), isNanVal);
    }

    noiseVoltage: NoiseVoltageFn = (temperatures: number[], config: number[], cable_att: number[], lengths: number[], stages: string[], frequency: number) => {
        const jsToPy = javascriptToPython;

        const [temperaturesNoNaN, isNanVal] = this.getNaNValuePositions(temperatures);

        const code = `
        from CryowalaCore import param_functions
        import json
        model_functions.noise_voltage(
            temp=${jsToPy(temperaturesNoNaN)},
            att=${jsToPy(config)},
            cable_att=${jsToPy(cable_att)},
            lengths=${jsToPy(lengths)},
            stage_labels=${jsToPy(stages)},
            f=${jsToPy(frequency * 1e9)}
        ).to_json(double_precision=15)`;
        return this.filterRecord(this.runJSON(code), isNanVal);
    }

    // eslint-disable-next-line max-lines-per-function
    generateNoiseData(temperatures: number[], config: number[], cable_att: number[], lengths: number[], stages: string[], frequency: number): number[][] {
        const jsToPy = javascriptToPython;

        const [temperaturesNoNaN, isNanVal] = this.getNaNValuePositions(temperatures);

        const code = `
        from CryowalaCore import param_functions
        import numpy as np
        import pandas as pd
        import json

        n_data = []

        n_data.append(model_functions.noise_photons(
            temp=${jsToPy(temperaturesNoNaN)},
            att=${jsToPy(config)},
            cable_att=${jsToPy(cable_att)},
            lengths=${jsToPy(lengths)},
            stage_labels=${jsToPy(stages)},
            f=${jsToPy(frequency * 1e9)}
        ).to_list())
        n_data.append(model_functions.noise_current(
            temp=${jsToPy(temperaturesNoNaN)},
            att=${jsToPy(config)},
            cable_att=${jsToPy(cable_att)},
            lengths=${jsToPy(lengths)},
            stage_labels=${jsToPy(stages)},
            f=${jsToPy(frequency * 1e9)}
        ).to_list())
        n_data.append(model_functions.noise_voltage(
            temp=${jsToPy(temperaturesNoNaN)},
            att=${jsToPy(config)},
            cable_att=${jsToPy(cable_att)},
            lengths=${jsToPy(lengths)},
            stage_labels=${jsToPy(stages)},
            f=${jsToPy(frequency * 1e9)}
        ).to_list())
        json.dumps(n_data)
        `
        const rawResult: number[][] = this.runJSON(code);
        const result = rawResult.map((noiseType) => noiseType.map((temp, i) => (isNanVal[i]) ? NaN : temp));
        return result;
    }

    // eslint-disable-next-line max-lines-per-function
    sweepModelOuter: SweepModelOuterFn = (range, values, cableData, configs, stages, lineData) => {
        // generate heat load and temperature line outputs
        const output: Record<string, Array<number>> = {};

        const totalAbsHeatLoadForStages: number[][] = []; // [stage][range]
        for (let m = 0; m < stages.length; m++) {
            const absHeatLoadForStage: number[][] = [];
            const heatLoadForStage: number[][] = [];
            const temperatureForStage: number[][] = [];
            var lines: number[][] = lineData.lines.map(() => []);
            // generate passive and active graph lines for each stage (where appliciple (not for output lines))
            for (let n = 0; n < lineData.lineNames.length; n++) {
                const absHeatLoadForLine: number[] = [];
                const heatLoadForLine: number[] = [];
                const temperatureForLine: number[] = [];
                for (let o = 0; o < range.length; o++) {
                    absHeatLoadForLine.push(values.absHeatLoads[m][o][n]);
                    heatLoadForLine.push(values.heatLoads[m][o][n]);
                    temperatureForLine.push(values.temperatures[m][o][n]);
                }
                absHeatLoadForStage.push(absHeatLoadForLine);
                heatLoadForStage.push(heatLoadForLine);
                temperatureForStage.push(temperatureForLine);
                const name = String(stages[m] + '_' + lineData.lineNames[n][1] + lineData.lineNames[n][0])
                output[name] = heatLoadForLine;
                for (let l in lineData.lines) {
                    if (lineData.lines[l].id === lineData.lineNames[n][1]) lines[l].push(n);
                }
            }

            // generate total graph lines for for each line type (except output) for each stage
            // also generate an overall total line for the stage
            var overallTotalHeatLoad: number[] = range.map(() => 0);
            var overallTotalAbsHeatLoad: number[] = range.map(() => 0);
            for (let p = 0; p < lines.length; p++) {
                if (lines[p].length === 2) {
                    const name = String(stages[m] + '_' + lineData.lineNames[lines[p][0]][1] + 'Total');
                    const totalHeatLoadForLine = range.map((x, i) => heatLoadForStage[lines[p][0]][i] + heatLoadForStage[lines[p][1]][i]);
                    output[name] = totalHeatLoadForLine;
                    overallTotalHeatLoad = range.map((x, i) => overallTotalHeatLoad[i] + totalHeatLoadForLine[i]);
                    const totalAbsHeatLoadForLine = range.map((x, i) => absHeatLoadForStage[lines[p][0]][i] + absHeatLoadForStage[lines[p][1]][i]);
                    overallTotalAbsHeatLoad = range.map((x, i) => overallTotalAbsHeatLoad[i] + totalAbsHeatLoadForLine[i]);
                } else if (lines[p].length === 1) {
                    overallTotalHeatLoad = range.map((x, i) => overallTotalHeatLoad[i] + heatLoadForStage[lines[p][0]][i]);
                    overallTotalAbsHeatLoad = range.map((x, i) => overallTotalAbsHeatLoad[i] + absHeatLoadForStage[lines[p][0]][i]);
                }
            }
            output[String(stages[m] + '_TotalHeatLoad')] = overallTotalHeatLoad;
            totalAbsHeatLoadForStages.push(overallTotalAbsHeatLoad);
        }

        // calculate total Temperature Values
        const totalTemperatureForStages: number[][] = stages.map(() => []); // [stage][range]
        range.forEach((_, p) => {
            const values: number[] = this.applyBoundedTStages(totalAbsHeatLoadForStages.map((stage) => stage[p]));
            stages.forEach((_, s) => totalTemperatureForStages[s].push(values[s]));
        });

        stages.forEach((stage, s) => output[String(stage + '_TotalTemperature')] = totalTemperatureForStages[s]);

        // calculate the noise at each point of the sweep
        const noiseData: number[][][] = [];
        for (let q = 0; q < configs.length; q++) {
            noiseData.push(this.generateNoiseData(values.temperatures[stages.length][q], configs[q], cableData.cable_att, cableData.lengths, stages, cableData.frequency));
        }

        //generate noise graph lines for each stage, and a total noise graph line
        const noiseTypes: string[] = ['Photons', 'Current', 'Voltage'];

        for (let nT = 0; nT < noiseTypes.length; nT++) {
            var noiseTotal: number[] = range.map(() => 0);
            for (let r = 1; r <= stages.length; r++) {
                const noiseLineForStage: number[][] = noiseTypes.map(() => []);
                for (let s = 0; s < range.length; s++) {
                    noiseLineForStage[nT].push(noiseData[s][nT][r])
                    noiseTotal[s] += noiseData[s][nT][r];
                }
                output[String(stages[r - 1] + '_Noise' + noiseTypes[nT])] = noiseLineForStage[nT];
            }
            //add "RT" values to output and to total noise graph line
            const noiseLineRT: number[][] = noiseTypes.map(() => []);
            for (let t = 0; t < range.length; t++) {
                noiseLineRT[nT].push(noiseData[t][nT][0])
                noiseTotal[t] += noiseData[t][nT][0];
            }
            output[String('RT_Noise' + noiseTypes[nT])] = noiseLineRT[nT];
            output[String('total_Noise' + noiseTypes[nT])] = noiseTotal;
        }

        output['range'] = range;
        return output;
    }

    // eslint-disable-next-line max-lines-per-function
    constraintGeneration: ConstraintGenerationFn = (constraints, range) => {
        const jsToPy = javascriptToPython;
        var constraintArr: string = '[';
        //[constraint[0], constraint[1], constraint[2], constraint[3], constraint[4], ...]
        for (let c = 0; c < constraints.length; c++) {
            (c != constraints.length - 1) ? constraintArr += constraints[c] + ', ' : constraintArr += constraints[c] + ']';
        }
        const start: number = range[0];
        const points: number = range.length;
        const end: number = range[points - 1];
        const code = `
        import math
        import random
        import numpy as np
        import json
        A = ${jsToPy(range)}
        start = ${jsToPy(start)}
        end = ${jsToPy(end)}
        points = ${jsToPy(points)}
        configs = [` + constraintArr + ` for x in A]
        json.dumps(configs)
        `
        return this.runJSON(code);
    }

    specificConstraintGeneration: SpecificConstraintGenerationFn = (constraints, x, y) => {
        const jsToPy = javascriptToPython;
        var constraintArr: string = '[';
        //[constraint[0], constraint[1], constraint[2], constraint[3], constraint[4], ...]
        for (let c = 0; c < constraints.length; c++) {
            (c != constraints.length - 1) ? constraintArr += constraints[c] + ', ' : constraintArr += constraints[c] + ']';
        }
        const code = `
        import math
        import random
        import numpy as np
        import json
        x = ${jsToPy(x)}
        y = ${jsToPy(y)}
        configs = ` + constraintArr + `
        json.dumps(configs)
        `
        return this.runJSON(code);
    }
}

export function useCryogenicModel(): CryoModel {
    const pythonRT = usePythonRuntime();

    return new CryoModel(pythonRT.pyodide, pythonRT.error, pythonRT.loaded);
}
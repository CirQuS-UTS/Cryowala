/* eslint-disable max-lines-per-function */
import { FridgeConfig, SegmentConfig, StageConfig, Thermalisation, ThermalisationOptions, LineLoadOutput, NoiseData2DSweep, SweepResults2D } from "@/components/pyodide/fridge.d"
import { CryoModelInterface, ThermalConductivity, ThermalScheme, LineData } from "@/components/pyodide/types.d"

function isAuto(thermalisation: Thermalisation): boolean {
    return thermalisation === "auto";
}

function getThermalisationAsBoolean(thermalisation: Thermalisation): boolean {
    if (!ThermalisationOptions.includes(thermalisation)) {
        throw new Error(`Invalid thermalisation value ${thermalisation}.`);
    }


    if (isAuto(thermalisation)) {
        throw new Error("Cannot get boolean value of auto thermalisation.");
    }

    if (!ThermalisationOptions.includes(thermalisation)) {
        throw new Error(`Invalid thermalisation value ${thermalisation}.`);
    }

    if (thermalisation === "on") {
        return true;
    } else if (thermalisation === "off") {
        return false;
    } else {
        throw new Error(`Unknown thermalisation value ${thermalisation}.`);
    }
}

function shouldThermalise(thermalisation: Thermalisation, defaultThermalisation: boolean): boolean {
    return isAuto(thermalisation) ? defaultThermalisation : getThermalisationAsBoolean(thermalisation);
}


function getInnerThermalisation(segment: SegmentConfig): boolean {
    const defaultThermalisation = segment.attenuation !== 0;
    return isAuto(segment.innerThermalisation) ? defaultThermalisation : getThermalisationAsBoolean(segment.innerThermalisation);
}

function getDielectricThermalisation(segment: SegmentConfig): boolean {
    const defaultThermalisation = segment.attenuation !== 0;
    return isAuto(segment.dielectricThermalisation) ? defaultThermalisation : getThermalisationAsBoolean(segment.dielectricThermalisation);
}

function getOuterThermalisation(segment: SegmentConfig): boolean {
    const defaultThermalisation = true;
    return isAuto(segment.outerThermalisation) ? defaultThermalisation : getThermalisationAsBoolean(segment.outerThermalisation);
}


function getThermalScheme(stages: StageConfig[], segments: SegmentConfig[]): [ThermalScheme, ThermalScheme, ThermalScheme] {
    const orderedSegments = stages
        .map(s => segments.find(seg => seg.stageId === s.id))
        .filter(s => s !== undefined) as SegmentConfig[];

    if (orderedSegments.length !== stages.length) {
        throw new Error("Not all stages have a segment.");
    }

    return [
        orderedSegments.map(s => getInnerThermalisation(s)),
        orderedSegments.map(s => getDielectricThermalisation(s)),
        orderedSegments.map(s => getOuterThermalisation(s)),
    ];
}

function getLineSegments(fridge: FridgeConfig, lineId: string): FridgeConfig["segments"] {
    const segments = fridge.segments.filter(s => s.lineId === lineId);
    if (segments.length === 0) {
        throw new Error(`No segments found for line ${lineId}.`);
    }

    return segments;
}

function getLineCables(fridge: FridgeConfig, lineId: string): FridgeConfig["cables"] {
    const segments = getLineSegments(fridge, lineId);

    const cables = fridge.cables.filter(c => segments.map(s => s.cableId).includes(c.id));
    if (cables.length === 0) {
        throw new Error(`No cables found for line ${lineId}.`);
    }

    return cables;
}

function getLineCable(fridge: FridgeConfig, lineId: string): FridgeConfig["cables"][0] {
    const cables = getLineCables(fridge, lineId);

    if (cables.length !== 1) {
        throw new Error(`Line ${lineId} has ${cables.length} cables. Only one cable is supported in this context.`);
    }

    return cables[0];
};

export function passiveDrive(model: CryoModelInterface, fridge: FridgeConfig): LineLoadOutput[] {
    const lines = fridge.lines.filter(l => l.signalType === "Drive");
    const results: LineLoadOutput[] = [];
    for (const line of lines) {
        const segments = getLineSegments(fridge, line.id);
        const cable = getLineCable(fridge, line.id);
        const cableDiameter = (cable.diameters[2] * 1e5).toFixed(0);
        const thermalConductivity: ThermalConductivity = [cable.thermalConductivityValue, cableDiameter];
        const output = model.passiveLoad(
            fridge.stages.map(s => s.id),
            cable.diameters,
            segments.map(s => s.length),
            fridge.stages.map(s => s.temperature),
            [thermalConductivity, [0, cableDiameter], thermalConductivity], // (mitch): This probably shouldn't be hard coded, but I don't know how to determine what this should be.
            getThermalScheme(fridge.stages, segments)
        );
        const result: LineLoadOutput = {
            output: output,
            line: line,
            type: 'Passive'
        }
        results.push(result);
    }
    return results;
}

export function passiveFlux(model: CryoModelInterface, fridge: FridgeConfig): LineLoadOutput[] {
    const lines = fridge.lines.filter(l => l.signalType === "Flux");
    const results: LineLoadOutput[] = [];
    for (const line of lines) {
        const segments = getLineSegments(fridge, line.id);
        const cable = getLineCable(fridge, line.id);
        const cableDiameter = (cable.diameters[2] * 1e5).toFixed(0);
        const thermalConductivity: ThermalConductivity = [cable.thermalConductivityValue, cableDiameter];
        const output = model.passiveLoad(
            fridge.stages.map(s => s.id),
            cable.diameters,
            segments.map(s => s.length),
            fridge.stages.map(s => s.temperature),
            [thermalConductivity, [0, cableDiameter], thermalConductivity], // Note(mitch): This probably shouldn't be hard coded, but I don't know how to determine what this should be.
            getThermalScheme(fridge.stages, segments)
        );
        const result: LineLoadOutput = {
            output: output,
            line: line,
            type: 'Passive'
        }
        results.push(result);
    }
    return results;
}

export function passiveOutput(model: CryoModelInterface, fridge: FridgeConfig): LineLoadOutput[] {
    const lines = fridge.lines.filter(l => l.signalType === "Output");
    const results: LineLoadOutput[] = [];
    for (const line of lines) {
        const segments = getLineSegments(fridge, line.id);
        const cables = getLineCables(fridge, line.id);
        const cableResults: Record<string, Record<string, number>> = {};
        for (const cable of cables) {
            const cableDiameter = (cable.diameters[2] * 1e5).toFixed(0);
            const thermalConductivity: ThermalConductivity = [cable.thermalConductivityValue, cableDiameter];
            const output = model.passiveLoad(
                fridge.stages.map(s => s.id),
                cable.diameters,
                segments.map(s => s.length),
                fridge.stages.map(s => s.temperature),
                [thermalConductivity, [0, cableDiameter], thermalConductivity], // Note(mitch): This probably shouldn't be hard coded, but I don't know how to determine what this should be.
                getThermalScheme(fridge.stages, segments)
            );
            cableResults[cable.id] = output;
        }
        const sumSegments: Record<string, number> = {};
        for (const stage of fridge.stages) {
            const segment = segments.find(s => s.stageId === stage.id);
            if (!segment) {
                throw new Error(`No segment found for stage ${stage.id} in line ${line.id}.`);
            }
            sumSegments[stage.id] = (sumSegments[stage.id] ?? 0) + cableResults[segment.cableId][stage.id];
        }
        const result: LineLoadOutput = {
            output: sumSegments,
            line: line,
            type: 'Passive'
        }
        results.push(result);
    }
    return results;
}

export function activeDrive(model: CryoModelInterface, fridge: FridgeConfig): LineLoadOutput[] {
    const lines = fridge.lines.filter(l => l.signalType === "Drive");
    const results: LineLoadOutput[] = [];
    for (const line of lines) {
        const segments = getLineSegments(fridge, line.id);
        const cable = getLineCable(fridge, line.id);
        const output = model.activeLoadAC(
            fridge.stages.map(s => s.id),
            segments.map(s => s.length),
            segments.map(s => s.attenuation),
            cable.bivariateCableData,
            line.signalPower,
            line.signalFrequency
        );
        for (const stage of fridge.stages) {
            output[stage.id] *= 0.33; // (mitch): This is a hard coding on Adrien's logic, I don't really know how I am mean to generate this information.
        }
        const result: LineLoadOutput = {
            output: output,
            line: line,
            type: 'Active'
        }
        results.push(result);
    }
    return results;
}

export function activeFlux(model: CryoModelInterface, fridge: FridgeConfig): LineLoadOutput[] {
    const lines = fridge.lines.filter(l => l.signalType === "Flux");
    const results: LineLoadOutput[] = [];
    for (const line of lines) {
        const segments = getLineSegments(fridge, line.id);
        const cable = getLineCable(fridge, line.id);
        const output = model.activeLoadDC(
            fridge.stages.map(s => s.id),
            cable.diameters,
            segments.map(s => s.length),
            segments.map(s => s.attenuation),
            line.inputCurrent,
            cable.rho
        );
        for (const stage of fridge.stages) {
            output[stage.id] *= 1; // (mitch): This is a hard coding on Adrien's logic, I don't really know how I am mean to generate this information.
        }
        const result: LineLoadOutput = {
            output: output,
            line: line,
            type: 'Active'
        }
        results.push(result);
    }
    return results;
}

export function driveNoise(model: CryoModelInterface, fridge: FridgeConfig): Record<string, number> {
    const lines = fridge.lines.filter(l => l.signalType === "Drive");

    const results: Record<string, number> = {};
    for (const line of lines) {
        const segments = getLineSegments(fridge, line.id);
        const cable = getLineCable(fridge, line.id);

        const result = model.driveNoise(
            fridge.stages.map(s => s.id),
            segments.map(s => s.length),
            fridge.stages.map(s => s.temperature),
            segments.map(s => s.attenuation),
            cable.bivariateCableData,
            line.signalFrequency
        );

        for (const stage of Object.keys(result)) {
            results[stage] = (results[stage] ?? 0) + result[stage]
        }
    }

    return results;
}

export function fluxNoise(model: CryoModelInterface, fridge: FridgeConfig): Record<string, number> {
    const lines = fridge.lines.filter(l => l.signalType === "Flux");

    const results: Record<string, number> = {};
    for (const line of lines) {
        const segments = getLineSegments(fridge, line.id);
        const cable = getLineCable(fridge, line.id);

        const result = model.fluxNoise(
            fridge.stages.map(s => s.id),
            segments.map(s => s.length),
            fridge.stages.map(s => s.temperature),
            segments.map(s => s.attenuation),
            cable.bivariateCableData,
            line.signalFrequency
        );

        for (const stage of Object.keys(result)) {
            results[stage] = (results[stage] ?? 0) + result[stage]
        }
    }

    return results;
}

export function cableAttenuation(model: CryoModelInterface, fridge: FridgeConfig, segment: SegmentConfig): number {
    const cable = fridge.cables.find(c => c.id === segment.cableId);
    if (!cable) {
        throw new Error(`No cable found for stage ${segment.stageId} on the ${segment.lineId} line.`);
    }
    const line = fridge.lines.find(l => l.id === segment.lineId);
    if (!line) {
        throw new Error(`No line found for stage ${segment.stageId} on the ${segment.lineId} line.`);
    }

    return model.cableAttenuation(cable.bivariateCableData, line.signalFrequency);
}

export function applyLineTransformations(stages: StageConfig[], arr: LineLoadOutput[], applyCooling: boolean = false): LineLoadOutput[] {
    for (let i = 0; i < arr.length; i++) {
        for (const stage of stages) {
            arr[i].output[stage.id] *= arr[i].line.count;
            if (applyCooling) {
                arr[i].output[stage.id] /= stage.coolingPower;
            }
        }
    }
    return arr;
}

export function sumLineLoadOutputs(stages: StageConfig[], arr: LineLoadOutput[]): Record<string, number> {
    const results: Record<string, number> = {};
    for (let i = 0; i < arr.length; i++) {
        for (const stage of stages) {
            results[stage.id] = (results[stage.id] ?? 0) + arr[i].output[stage.id]
        }
    }
    return results;
}

export function linspace(start: number, end: number, points: number): number[] {
    var arr = [];
    var step = (end - start) / (points - 1);
    for (var i = 0; i < points; i++) {
        arr.push(start + (step * i));
    }
    return arr;
}

export function logspace(start: number, end: number, points: number): number[] {
    var f: number = Math.pow(end / start, 1 / --points);
    var result: number[] = [start];
    while (--points) {
        result.push(Number(result[result.length - 1] * f));
    }
    result.push(end);
    return result;
}

function getLineCableAttenutationPoints(model: CryoModelInterface, fridge: FridgeConfig, lineId: string): number[] {
    const segments = getLineSegments(fridge, lineId);
    const segmentCables = segments.map(segment => fridge.cables.filter(cable => cable.id == segment.cableId));
    const segmentCableAtts: number[] = [];
    const line = fridge.lines.filter(line => line.id == lineId);
    for (let i = 0; i < segmentCables.length; i++) {
        if (segmentCables[i].length == 0) {
            throw new Error(`No cable type was found for line ${lineId} at stage ${segments[i].stageId}.`);
        } else if (segmentCables[i].length > 1) {
            throw new Error(`More than 1 cable type was found for line ${lineId} at stage ${segments[i].stageId}.`);
        } else if (line.length == 0) {
            throw new Error(`Specified line ${lineId} could not be found`);
        } else if (line.length > 1) {
            throw new Error(`More than 1 line with the id ${lineId} was found`);
        } else {
            // TODO: different handeling for DC lines?
            if (line[0].currentType == 'DC') null;
            // get line frequency
            const lineFrequency = line[0].signalFrequency;
            // get cable_att generation function for cable type specified in segment
            // and use it with line frequency to generate the cable attenuation for this segment
            const cableAtt = model.cableAttGeneration(segmentCables[i][0].bivariateCableData, lineFrequency);
            // sum up generated cable attenuation for the line
            segmentCableAtts.push(cableAtt);
        }
    }
    // return the cable attenuations for the line
    return segmentCableAtts;
}

function getConfForStage(stages: string[], segment: SegmentConfig, config: number[]): number {
    for (let k = 0; k < stages.length; k++) {
        if (segment.stageId === stages[k]) return config[k];
    }
    return segment.attenuation;
}

function createNewFridge(fridge: FridgeConfig, lineID: string, stages: string[], conf: number[]): FridgeConfig {
    const newSegments: SegmentConfig[] = [];
    for (let j = 0; j < fridge.segments.length; j++) {
        const seg = {
            cableId: fridge.segments[j].cableId,
            lineId: fridge.segments[j].lineId,
            stageId: fridge.segments[j].stageId,
            attenuation: (fridge.segments[j].lineId === lineID) ? getConfForStage(stages, fridge.segments[j], conf) : fridge.segments[j].attenuation,
            length: fridge.segments[j].length,
            innerThermalisation: fridge.segments[j].innerThermalisation,
            dielectricThermalisation: fridge.segments[j].dielectricThermalisation,
            outerThermalisation: fridge.segments[j].outerThermalisation
        }
        newSegments.push(seg);
    }
    return {
        stages: fridge.stages,
        cables: fridge.cables,
        lines: fridge.lines,
        segments: newSegments
    };
}

function getOutputLineTypeNames(lineData: LineData): [string, string][] {
    const outTypeByLine: [string, string][][] = [];
    var outputTypes: [string, string][] = [];
    const lines: number[][] = [];
    for (let l in lineData.lines) {
        lines.push([])
        outTypeByLine.push([]);
    }
    for (let y = 0; y < lineData.lineNames.length; y++) {
        for (let t = 0; t < lineData.lines.length; t++) {
            if (lineData.lineNames[y][1] === lineData.lines[t].id) outTypeByLine[t].push([lineData.lineNames[y][1], lineData.lineNames[y][0]])
        }
        for (let l in lineData.lines) {
            if (lineData.lines[l].id === lineData.lineNames[y][1]) lines[l].push(y);
        }
    }
    for (let p = 0; p < lines.length; p++) {
        if (lines[p].length === 2) {
            for (let q = 0; q < lineData.lines.length; q++) {
                if (lineData.lineNames[lines[p][0]][1] === lineData.lines[q].id) outTypeByLine[q].push([lineData.lineNames[lines[p][0]][1], 'Total']);
            }
        }
    }
    for (let h = 0; h < outTypeByLine.length; h++) {
        outputTypes = outputTypes.concat(outTypeByLine[h]);
    }
    return outputTypes;
}

function generateLineLoadOutputs(model: CryoModelInterface, fridge: FridgeConfig, applyCooling: boolean = false): LineLoadOutput[] {
    const p_drive = applyLineTransformations(fridge.stages, passiveDrive(model, fridge), applyCooling);
    const p_flux = applyLineTransformations(fridge.stages, passiveFlux(model, fridge), applyCooling);
    const p_out = applyLineTransformations(fridge.stages, passiveOutput(model, fridge), applyCooling);
    const a_ac = applyLineTransformations(fridge.stages, activeDrive(model, fridge), applyCooling);
    const a_dc = applyLineTransformations(fridge.stages, activeFlux(model, fridge), applyCooling);
    return [
        ...p_drive,
        ...p_flux,
        ...p_out,
        ...a_ac,
        ...a_dc
    ];
}

export function sweepModel(model: CryoModelInterface, fridge: FridgeConfig, xAxis: { start: number, end: number, points: number }, constraints: string[], lineID: string, linSpace: boolean = true): [Record<string, Array<number>>, [string, string][]] {
    const cooling_power: number[] = fridge.stages.map((stage) => stage.coolingPower);
    const stages: string[] = fridge.stages.map(stage => stage.id);

    const range: number[] = (linSpace)
        ? linspace(xAxis.start, xAxis.end, xAxis.points)
        : logspace(xAxis.start, xAxis.end, xAxis.points);
    const configs: number[][] = model.constraintGeneration(constraints, range);

    const absHeatLoads: Array<number[][]> = [...stages.map(() => [])];
    const heatLoads: Array<number[][]> = [...stages.map(() => [])];
    var temperatures: Array<number[][]> | null = [...stages.map(() => []), []];

    const line = fridge.lines.find(line => line.id === lineID);

    if (line === undefined) throw new Error(`Line ${lineID} cannot be found.`);

    const lengths: number[] = getLineSegments(fridge, lineID).map(segment => segment.length);
    const cable_att: number[] = getLineCableAttenutationPoints(model, fridge, lineID);
    var lineNames: [string, string][] = [];
    const lineFrequency = line.signalFrequency;

    for (var conf of configs) {
        const newFridge = createNewFridge(fridge, lineID, stages, conf);
        const data: LineLoadOutput[] = generateLineLoadOutputs(model, newFridge, false);
        lineNames = [];

        for (let o = 0; o < data.length; o++) {
            lineNames.push([data[o].type, data[o].line.id]);
        }

        const result = model.sweepModelInner(data, cooling_power);

        for (var i = 0; i < stages.length; i++) {
            absHeatLoads[i].push(result.absHeatValues[i]);
            heatLoads[i].push(result.heatValues[i]);
        }
        for (var i = 0; i < stages.length; i++) {
            temperatures[i].push(result.tempValues[i]);
        }
        temperatures[stages.length].push(result.tempValues[stages.length]);

    }


    const lineData: LineData = { lineNames: lineNames, lines: fridge.lines }
    const outputTypes = getOutputLineTypeNames(lineData);

    return [model.sweepModelOuter(
        range,
        {
            absHeatLoads,
            heatLoads,
            temperatures
        },
        {
            cable_att,
            lengths,
            frequency: lineFrequency
        },
        configs,
        stages,
        lineData
    ), outputTypes];
}


function sumRecord(record: Record<string, number>): number {
    var result: number = 0;
    const keys = Object.keys(record);
    for (var k = 0; k < keys.length; k++) {
        result = result + record[keys[k]];
    }
    return result
}

function updateFridgeStagesTemps(fridge: FridgeConfig, sTemp: number[]): FridgeConfig {
    var newStages = fridge.stages;
    if (sTemp.length == fridge.stages.length) {
        newStages = fridge.stages.map((s, i) => {
            return {
                id: s.id,
                index: s.index,
                temperature: sTemp[i],
                coolingPower: s.coolingPower
            }
        })
    } else {
        throw new Error(`Not enough values to update fridge stage temperatures.`);
    }
    return {
        stages: newStages,
        cables: fridge.cables,
        lines: fridge.lines,
        segments: fridge.segments
    };
}

export function sweepModel2D(model: CryoModelInterface, fridge: FridgeConfig, lineID: string, xAxis: { xStart: number, xEnd: number, xPoints: number }, yAxis: { yStart: number, yEnd: number, yPoints: number }, constraints: string[] = ['0', '60 - a - b', '0', 'b', 'a']): SweepResults2D {
    const stages: string[] = fridge.stages.map(s => s.id);
    const cooling_power: number[] = fridge.stages.map((stage) => stage.coolingPower);

    const xRange: number[] = linspace(xAxis.xStart, xAxis.xEnd, xAxis.xPoints);
    const yRange: number[] = linspace(yAxis.yStart, yAxis.yEnd, yAxis.yPoints);

    // get line config for line lineID
    const line = fridge.lines.find(line => line.id === lineID);
    // and check it is valid, if not, throw an error
    if (line === undefined) throw new Error(`Line ${lineID} cannot be found.`);
    //shape = [points][points][3]
    // total heat load data
    const data_loads: Record<string, number>[][] = [];
    // total temperature data
    const data_temps: Record<string, number>[][] = [];
    // total noise data
    const data_noise: NoiseData2DSweep[][] = [];

    // to fill in points that would result in a negative value
    const emptyStages: Record<string, number> = {};
    stages.forEach((s) => emptyStages[s] = 0);
    const emptyNoise: NoiseData2DSweep = {
        photons: 0,
        voltage: 0,
        current: 0
    }

    //nested loops
    for (let i = 0; i < xAxis.xPoints; i++) {  //MXC
        data_loads.push([]);
        data_temps.push([]);
        data_noise.push([]);
        for (let j = 0; j < yAxis.yPoints; j++) {  //CP
            // calculate configs from constraints
            const initConstraints = model.specificConstraintGeneration(constraints, xRange[i], yRange[j])
            const configs = initConstraints.map((c) => (c < 0 && c > -10e-5) ? 0 : c);
            // if any config value is less than 0, return empty values
            if (configs.some((c) => c < 0)) {
                data_loads[i].push(emptyStages);
                data_temps[i].push(emptyStages);
                data_noise[i].push(emptyNoise);
            } else {
                // determine number of lines
                const lineCount: number[] = [];
                fridge.lines.forEach((l) => {
                    if (l.signalType == 'Output') lineCount.push(1);
                    else lineCount.push(...[1, 1]);
                })
                var newFridge = createNewFridge(fridge, lineID, stages, configs);
                // initial temperature estimates (should instead update configuration file)
                var t_est = [4.20111000e+1, 3.41026571e+0, 1.20520821e+0, 1.63359036e-1, 1.64774143e-2];//fridge.stages.map((stage) => stage.temperature);
                var load_matrix_0: number[][] = lineCount.map(() => stages.map(() => 0));
                var delta_load_matrix: number[][] = lineCount.map(() => stages.map(() => 1));
                const threshold: number = 0.0005;
                var lineNames: {
                    type: ("Passive" | "Active" | "Total"),
                    name: string,
                    signalType: ("Drive" | "Flux" | "Output")
                }[] = [];

                //catch if temperature estimates recieve NaN values
                var tempOutOfBounds: boolean = false;

                // loop while degree of change between results from previous loops exceeds threshold
                while (delta_load_matrix.some((m) => m.some((n) => n > threshold))) {
                    // update fridge configs stage temperature values
                    newFridge = updateFridgeStagesTemps(newFridge, t_est);

                    // generate heat load data
                    const data: LineLoadOutput[] = generateLineLoadOutputs(model, newFridge, false);

                    // sum up data values for calculating temperature
                    var totalTemp: number[] = stages.map((stage) => {
                        var sum = 0;
                        data.forEach((d) => sum += d.output[stage]);
                        return sum;
                    });

                    lineNames = [];
                    data.forEach((d) => lineNames.push({ type: d.type, name: d.line.id, signalType: d.line.signalType }));

                    // calculate temperature estimate
                    t_est = model.applyBoundedTStages(totalTemp);

                    // check for NaN values in temperature estimates
                    if (t_est.some((t) => isNaN(t))) {
                        tempOutOfBounds = true;
                        break;
                    }

                    // check for NaN values in temperature estimates
                    if (t_est.some((t) => isNaN(t))) {
                        tempOutOfBounds = true;
                        break;
                    }

                    // collate data to matrix, applying cooling power
                    const load_matrix: number[][] = data.map((d) =>
                        stages.map((stage, s) => (d.output[stage] / cooling_power[s]))
                    )

                    // update delta load matrix according to change from previous load matrix to new load matrix
                    delta_load_matrix = load_matrix_0.map((l, i) => l.map((s, j) => 1 - (s / load_matrix[i][j])));

                    // update to current load matrix for next loop
                    load_matrix_0 = load_matrix.map((l) => l.map((s) => s));
                }

                //noise data
                // photons, voltage, current
                const n_data: Record<string, number>[] = [];
                const cable_att = getLineCableAttenutationPoints(model, fridge, lineID);
                const lengths: number[] = getLineSegments(fridge, lineID).map(segment => segment.length);

                n_data.push(model.noisePhotons(t_est, configs, cable_att, lengths, stages, line.signalFrequency));
                n_data.push(model.noiseVoltage(t_est, configs, cable_att, lengths, stages, line.signalFrequency));
                n_data.push(model.noiseCurrent(t_est, configs, cable_att, lengths, stages, line.signalFrequency));

                // determine columns that match lineID
                const addLines: number[] = [];
                for (let l = 0; l < lineNames.length; l++) {
                    if (lineNames[l].name == lineID) {
                        addLines.push(l);
                    }
                }

                // calculate and collate heat load and temperature totals for each stage using 
                // only data of the appropriate line (lineID)
                const heat_load_data: Record<string, number> = {};
                const temperature_data: Record<string, number> = {};

                for (let s = 0; s < stages.length; s++) {
                    var tempSum: number = 0;
                    for (let aL = 0; aL < addLines.length; aL++) {
                        tempSum += load_matrix_0[addLines[aL]][s];
                    }
                    heat_load_data[stages[s]] = tempSum;
                    temperature_data[stages[s]] = t_est[s];
                }

                // add values to overall data
                data_loads[i].push(heat_load_data);
                data_temps[i].push((tempOutOfBounds) ? emptyStages : temperature_data);
                data_noise[i].push((tempOutOfBounds) ? emptyNoise : {
                    photons: sumRecord(n_data[0]),
                    voltage: sumRecord(n_data[1]),
                    current: sumRecord(n_data[2])
                });
            }
        }
    }

    function rotate2DArray(arr: any[][]): any[][] {
        return arr[0].map((val, index) => arr.map(row => row[row.length - 1 - index]));
    }

    // collate results for return
    const result: SweepResults2D = {
        shape: {
            x: xRange,
            y: yRange
        },
        heat_loads: rotate2DArray(data_loads),
        temperatures: rotate2DArray(data_temps),
        noise: rotate2DArray(data_noise)
    }

    return result;
}
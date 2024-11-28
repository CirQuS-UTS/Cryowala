export interface CryoModelInterface {
	passiveLoad: PassiveLoadFn;
	activeLoadAC: ActiveLoadACFn;
	activeLoadDC: ActiveLoadDCFn;
	driveNoise: DriveNoiseFn;
	fluxNoise: FluxNoiseFn;
	cableAttenuation: CableAttenuationFn;
	applyTStages: ApplyTStagesFn;
	applyBoundedTStages: ApplyBoundedTStagesFn;
	sweepModelInner: SweepModelInnerFn;
	cableAttGeneration: CableAttGenerationFn;
	noisePhotons: NoisePhotonsFn;
	noiseCurrent: NoiseCurrentFn;
	noiseVoltage: NoiseVoltageFn;
	sweepModelOuter: SweepModelOuterFn;
	constraintGeneration: ConstraintGenerationFn;
	specificConstraintGeneration: SpecificConstraintGenerationFn;
	loadTemperatureEstimation: LoadTemperatureEstimationFn;
}

export type InnerPinDiameter = number;
export type DielectricDiameter = number;
export type OuterConductorDiameter = number;
export type Diameters = [InnerPinDiameter, DielectricDiameter, OuterConductorDiameter];

export type ThermalConductivityLabel = string;
export type ThermalConductivityValue = number;
export type ThermalConductivity = [ThermalConductivityValue, ThermalConductivityLabel];

export type ThermalScheme = boolean[];

export type BivariateCableData = {
	frequency: number,
	attenuation: number
};

export type TempEstimationPoint = {
	applied_power: number[],
	measured_temperature: number[]
}

/**
 * Returns list of `passive` loads of cable from n stages
 *
 * @arg {String_List} stage_labels - a list of n stage names
 * @arg {Float_List} diameters - a list of 3 values `innerPinDiameter`,`dielectricDiameter`,`outerConductorDiameter` of coaxial cable
 * @arg {Float_List} lengths - lengths of cable between stages n
 * @arg {Float_List} stage_temps - Temperature for each stage n
 * @arg {Float_List} therm_cond - 3 lists of 2 values thermal conductivity and cable diameter `NEED TO DOUBLECHECK WITH CLIENT`
 * @arg {Bool_List} therm_scheme - 3 lists of n booleans where n is the of stages
 */
export type PassiveLoadFn = (
	stage_labels: string[],
	diameters: Diameters,
	lengths: number[],
	stage_temps: number[],
	therm_cond: [ThermalConductivity, ThermalConductivity, ThermalConductivity],
	therm_scheme: [ThermalScheme, ThermalScheme, ThermalScheme]
) => Record<string, number>;

/**
 * Returns list of `active` AC loads of cable from n stages
 *
 * @arg {String_List} stage_labels - a list of n stage names
 * @arg {number[]} lengths - lengths of cable between n stages
 * @arg {Bool_List} att - attenuators for each stage n
 * @arg {number[5]} cable_att_points - the points to generate a cable attenuation function from
 * @arg {Float} signal_p - product of 2 parameters `inputSignalPower` (in Watts) and `dutyCycle` (between 0-1)
 * @arg {Float} signal_f - the frequency of the CW signal (in Hz)
 */
export type ActiveLoadACFn = (
	stage_labels: string[],
	lengths: number[],
	att: number[],
	bivariate_cable_points: BivariateCableData[],
	signal_p: number,
	signal_f: number
) => Record<string, number>;

/**
 * Returns list of `active` DC loads of cable from n stages
 *
 * @arg {String_List} stage_labels - a list of n stage names
 * @arg {Float_List} diameters - a list of 3 values `innerPinDiameter`,`dielectricDiameter`,`outerConductorDiameter` of coaxial cable
 * @arg {Float_List} lengths - lengths of cable between stages n
 * @arg {Float_List} att - attenuators for each stage n
 * @arg {Float} i_in - current at input of fridge (in Amps) -tidbit another way is v_in / 50
 * @arg {Float} cable_rho - Material Resistivity
 */
export type ActiveLoadDCFn = (
	stage_labels: string[],
	diameters: Diameters,
	lengths: number[],
	att: number[],
	i_in: number,
	cable_rho: number
) => Record<string, number>;

/**
 * Returns list of the noise in photons /s/Hz from n stages from given frequency f
 * @arg {String_List} stage_labels - a list of n stage names
 * @arg {Float_List} stage_temps - Temperature for each stage n
 * @arg {Float_List} lengths - lengths of cable between stages n (in meters)
 * @arg {pythonFn_List} cable_att_points - obtains list of cable attenuation by passing a `signal_p` attenuation in this case
 * @arg {float} f - Could be an array?
 * @arg {Float_List} att - attenuators for each stage n
 */
export type DriveNoiseFn = (
	stage_labels: string[],
	lengths: number[],
	stage_temps: number[],
	att: number[],
	bivariate_cable_points: BivariateCableData[],
	f: number,
) => Record<string, number>;

/**
 * Returns the Mean Square of the Current noise at every stage.
 *
 * Returns the value of the current noise spectral density function for an input frequency, f
 *
 * Note: To attain root mean square current fluctuations, the output must be square rooted.
 *
 * Product of type `DriveNoiseFn`, Planks constant and f / 50
 */
export type FluxNoiseFn = DriveNoiseFn;


/**
 * Returns the attenuation of the cable at a given frequency
 * @arg {Float_List} cable_att_points - the points to generate a cable attenuation function from
 * @arg {Float} f - the frequency of the signal (in Hz)
*/
export type CableAttenuationFn = (
	bivariate_cable_points: BivariateCableData[],
	f: number
) => number;

export type ApplyBoundedTStagesFn = (
	heatLoads: number[]
) => number[];

export type ApplyTStagesFn = (
	heatLoads: number[]
) => { temperatures: number[], heatLoadLimits: { lowerLimit: number, upperLimit: number }[] };

export type SweepModelInnerOutput = {
	absHeatValues: number[][],
	heatValues: nunber[][],
	tempValues: number[][]
}

export type SweepModelInnerFn = (
	lines: LineLoadOutput[],
	c_p: number[]
) => SweepModelInnerOutput;

export type LineData = {
	lineNames: [string, string][],
	lines: LineConfig[]
};

export type CableAttGenerationFn = (
	bivariate_cable_points: BivariateCableData[],
	frequency: number
) => number;

export type NoisePhotonsFn = (
	temperatures: number[],
	config: number[],
	cable_att: number[],
	lengths: number[],
	stages: string[],
	frequency: number
) => Record<string, number>;

export type NoiseCurrentFn = (
	temperatures: number[],
	config: number[],
	cable_att: number[],
	lengths: number[],
	stages: string[],
	frequency: number
) => Record<string, number>;

export type NoiseVoltageFn = (
	temperatures: number[],
	config: number[],
	cable_att: number[],
	lengths: number[],
	stages: string[],
	frequency: number
) => Record<string, number>;

export type SweepModelOuterFn = (
	range: number[],
	values: {
		absHeatLoads: number[][][],
		heatLoads: number[][][],
		temperatures: number[][][]
	},
	cableData: {
		cable_att: number[],
		lengths: number[],
		frequency: number
	},
	configs: number[][],
	stages: string[],
	lineData: LineData
) => Record<string, Array<number>>;

export type ConstraintGenerationFn = (
	constraints: string[],
	range: number[]
) => number[][];

export type SpecificConstraintGenerationFn = (
	constraints: string[],
	x: number,
	y: number
) => number[];

export type LoadTemperatureEstimationFn = (
	data: TempEstimationPoint[]
) => void;
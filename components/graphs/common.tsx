import { AxisBottom, AxisLeft,  AxisScale } from "@visx/axis";
import { AxisProps } from "@visx/axis/lib/axis/Axis";
import { GridRows } from "@visx/grid";
import { Legend } from "@visx/legend";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { FC, PropsWithChildren, ReactNode, createContext, useContext, useEffect, useMemo, useRef } from "react";
import { ScaleOrdinal } from "@visx/vendor/d3-scale";
import { localPoint } from "@visx/event";
import { Bar } from "@visx/shape";
import { BarProps } from "@visx/shape/lib/shapes/Bar";
import { AddSVGProps } from "@visx/shape/lib/types";

export type ScaleFn<FieldType = number> = (field: FieldType) => number;
export type AccessorFn<DataPointType, FieldType = number> = (dataPoint: DataPointType) => FieldType;
export type ConstrainFn<FieldType = number> = (field: FieldType) => FieldType;

export function compose<DataPointType, FieldType = number>(scale: ScaleFn<FieldType>, accessor: AccessorFn<DataPointType, FieldType>): (dataPoint: DataPointType) => number {
  return data => scale(accessor(data));
}

export function composeConstrained<DataPointType, FieldType = number>(scale: ScaleFn<FieldType>, accessor: AccessorFn<DataPointType, FieldType>, constraint: ConstrainFn<FieldType>): (dataPoint: DataPointType) => number {
  return data => scale(constraint(accessor(data)));
}

export function getAllValues<DataPointType>(data: DataPointType[], accessors: AccessorFn<DataPointType, number>[]): number[] {
  return data.flatMap(d => accessors.map(a => a(d)));
}

export function findMinMax(data: number[]): [number, number] {
  return [Math.min(...data), Math.max(...data)];
}

export function mustBeDefined<T>(val: T | undefined, reason: string = "Unexpected undefined value"): T {
  if (val === undefined) {
    throw new Error(reason);
  }
  return val;
}

export type Field<DataPointType, FieldType = number> = {
  name: string,
  colour: string,
  accessor: AccessorFn<DataPointType, FieldType>,
}

const MIN_GRAPHABLE_VALUE = 1e-5;
export const boundGraphableValue = (value: number) => Math.max(value, MIN_GRAPHABLE_VALUE);

const LABEL_COLOUR = "black";

export function StyledAxis<Scale extends AxisScale>({ axis, ...props }: { axis: FC<AxisProps<Scale>> } & AxisProps<Scale>) {
  const AxisComponent = axis;

  // Set default styles for the axis if they are not overridden by the caller
  props.labelProps = props.labelProps ?? { fill: LABEL_COLOUR, fontSize: 16, textAnchor: "middle" };
  props.stroke = props.stroke ?? LABEL_COLOUR;
  props.tickLineProps = props.tickLineProps ?? { stroke: LABEL_COLOUR };
  props.tickLabelProps = props.tickLabelProps ?? { fontSize: 11, fill: LABEL_COLOUR };

  return (<AxisComponent {...props}/>);
}

export type Margins = {
  top: number,
  bottom: number,
  left: number,
  right: number,
}

export type BaseGraphProps = PropsWithChildren<{
  width: number,
  height: number,
  margins: Margins,
  colourScale: ScaleOrdinal<string, string, never>,
  onLegendHeightUpdate: (height: number) => void,
}>
// eslint-disable-next-line max-lines-per-function
export function BaseGraph({ children, width, height, margins, colourScale, onLegendHeightUpdate }: BaseGraphProps) {
  const legendRef = useRef<HTMLDivElement>(null);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData: TooltipContents, hideTooltip, showTooltip: showTooltipRaw } = useTooltip<FC>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ scroll: true, detectBounds: true });

  useEffect(() => {
    const legend = legendRef.current;
    const height = legend?.getBoundingClientRect().height ?? 0;
    onLegendHeightUpdate(height);
  }, [legendRef, width, onLegendHeightUpdate]);

  const showTooltip: BaseTooltipShowFn = (display: FC) => {
    return (event: React.MouseEvent<SVGRectElement, MouseEvent>) => {
      const coords = localPoint(event);
      showTooltipRaw({
        tooltipData: display,
        tooltipLeft: coords?.x ?? 0,
        tooltipTop: coords?.y ?? 0,
      });
    }
  };

  const xMax = width - margins.left - margins.right;
  const yMax = height - margins.top - margins.bottom;

  return (
    <div>
      {/* Main Graph */}
      <svg ref={containerRef} width={width} height={height} xmlns="http://www.w3.org/2000/svg">
        <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
          {children}
        </TooltipContext.Provider>
      </svg>

      {/* Legend */}
      <div ref={legendRef}>
        <Legend
          style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', lineHeight: '20px', paddingTop: '10px', paddingBottom: '10px' }}
          itemMargin={'0 10px'}
          scale={colourScale}
          direction="row"
          labelMargin="0 10px 0 0"
        />
      </div>

      {/* Tooltip */}
      { tooltipOpen && TooltipContents && (
        <TooltipInPortal top={tooltipTop} left={tooltipLeft}>
          <TooltipContents />
        </TooltipInPortal>
      )}
    </div>
  );
}

export type BaseBarGraphProps = PropsWithChildren<{
  width: number,
  height: number,
  margins: Margins,
  xLabel: string,
  yLabel: string,
  xScale: AxisScale,
  yScale: AxisScale,
  xColourScale: ScaleOrdinal<string, string, never>,
  onLegendHeightUpdate: (height: number) => void,
  numTicksX?: number,
  numTicksY?: number,
  logScale?: boolean,
}>
// eslint-disable-next-line max-lines-per-function
export function BaseBarGraph({ children, width, height, xLabel, yLabel, margins, xScale, yScale, xColourScale, onLegendHeightUpdate, numTicksX, numTicksY, logScale = false }: BaseBarGraphProps) {
  const xMax = width - margins.left - margins.right;
  const yMax = height - margins.top - margins.bottom;

  const numTicksXDefault = xMax / 100;
  const numTicksYDefault = yMax / 50;

  // If the graph is logarithmic we override the default number of ticks:
  //  - try ensure there is an axis tick for each power of 10
  //  - try ensure there are 10 grid lines for each axis tick
  const [yMinLog, yMaxLog] = yScale.domain().map(Math.log10);
  const numLogTicksAxisY = Math.ceil(yMaxLog - yMinLog);
  const numLogTicksGridY = numLogTicksAxisY * 10;

  return (
    <BaseGraph 
      width={width} height={height} margins={margins}
      colourScale={xColourScale} onLegendHeightUpdate={onLegendHeightUpdate}
    >
      
      {/* Grid */}
      <GridRows
        left={margins.left}
        top={margins.top}
        scale={yScale}
        width={xMax}
        height={yMax}
        numTicks={logScale ? numLogTicksGridY : numTicksY ?? numTicksYDefault}
        stroke={LABEL_COLOUR}
      />

      {/* Axes */}
      <StyledAxis axis={AxisBottom}
        label={xLabel}
        scale={xScale}
        numTicks={numTicksX ?? numTicksXDefault}
        left={margins.left}
        top={yMax + margins.top}
      />
      <StyledAxis axis={AxisLeft}
        label={yLabel}
        scale={yScale}
        numTicks={logScale ? numLogTicksAxisY : numTicksY ?? numTicksYDefault}
        left={margins.left}
        top={margins.top}
        {...(logScale ? { tickFormat: (data) => data.valueOf().toExponential(0) } : {})}
      />

      {/* Bars */}
      {children}
    </BaseGraph>
  );
}

type EventHandler = (event: React.MouseEvent<SVGRectElement, MouseEvent>) => void;
type BaseTooltipShowFn = (display: FC) => EventHandler


// Tooltip provider
type TooltipFunctions = {
  showTooltip: BaseTooltipShowFn,
  hideTooltip: () => void,
};
export const TooltipContext = createContext<TooltipFunctions>({ showTooltip: (display: FC) => () => console.error("Tooltip not initialised", display), hideTooltip: () => console.error("Tooltip not initialised") });

type BarFieldProps<DataPointType> = AddSVGProps<BarProps, SVGRectElement> & {
  data: DataPointType,
  field: Field<DataPointType>,
  tooltip?: FC,
}
export function BarField<DataPointType>({ data, tooltip, field, height, ...props }: BarFieldProps<DataPointType>): ReactNode {
  const { showTooltip, hideTooltip } = useContext(TooltipContext);

  const diplayTooltip = tooltip ?? (() => (<span>{field.name}: {field.accessor(data)}</span>));

  if (!height || typeof height === "number" && height < 0) {
    height = 0;
  }

  return (
    <Bar
      fill={field.colour}
      onMouseLeave={hideTooltip}
      onMouseMove={showTooltip(diplayTooltip)}
      height={height}
      {...props}
    />
  );
}


function splitOnLastSpace(msg: string): string[] {
  const lastSpace = msg.lastIndexOf(" ");
  if (lastSpace === -1) {
    return [msg];
  } else {
    return [msg.substring(0, lastSpace), msg.substring(lastSpace + 1)];
  }
}
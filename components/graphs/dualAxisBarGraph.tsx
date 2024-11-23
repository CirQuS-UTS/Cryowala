import { Fragment, PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { BarField, BaseBarGraph, BaseGraph, Field, StyledAxis, findMinMax, getAllValues, mustBeDefined } from "@/components/graphs/common";
import { scaleBand, scaleLog, scaleOrdinal } from "@visx/scale";
import { AxisRight } from "@visx/axis";

export type DualAxisGraphProps<DataPointType> = PropsWithChildren<{
    data: DataPointType[],
    width: number,
    height: number,
    labelField: Field<DataPointType, string>,
    leftAxisField: Field<DataPointType, number>,
    rightAxisField: Field<DataPointType, number>,
    tooltip?: (field: Field<DataPointType>, dataPoint: DataPointType) => ReactNode,
}>;

// eslint-disable-next-line max-lines-per-function
export function DualAxisGraph<DataPointType>({ data, width, height: targetHeight, labelField, leftAxisField, rightAxisField, tooltip }: DualAxisGraphProps<DataPointType>) {
    const [legendHeight, setLegendHeight] = useState(0);
    const height = useMemo(() => targetHeight - legendHeight, [targetHeight, legendHeight]);
    
    const margin = { top: 10, bottom: 50, left: 65, right: 65 };

    const xMax = width - margin.left - margin.right;
    const yMax = height - margin.top - margin.bottom;

    const yDomainLeft = findMinMax(getAllValues(data, [leftAxisField.accessor]));
    const yDomainRight = findMinMax(getAllValues(data, [rightAxisField.accessor]));

    const xScale = scaleBand({
        range: [0, xMax],
        round: true,
        domain: data.map(labelField.accessor),
        padding: 0.4,
    });
    const xColourScale = scaleOrdinal({
        domain: [leftAxisField, rightAxisField].map(f => f.name),
        range: [leftAxisField, rightAxisField].map(f => f.colour),
    });
    const yScaleLeft = scaleLog({
        range: [yMax, 0],
        round: true,
        domain: [
            Math.pow(10, Math.floor(Math.log10(yDomainLeft[0]))),
            Math.pow(10, Math.ceil(Math.log10(yDomainLeft[1] * 1.05))),
        ],
    });
    const yScaleRight = scaleLog({
        range: [yMax, 0],
        round: true,
        domain: [
            Math.pow(10, Math.floor(Math.log10(yDomainRight[0]))),
            Math.pow(10, Math.ceil(Math.log10(yDomainRight[1] * 1.05))),
        ],
    });

    const xPoint = (dataPoint: DataPointType) => mustBeDefined(xScale(labelField.accessor(dataPoint)), `Label ${labelField.accessor(dataPoint)} is not defined on the X-axis scale.`);
    const yPointLeft = (dataPoint: DataPointType) => yScaleLeft(leftAxisField.accessor(dataPoint));
    const yPointRight = (dataPoint: DataPointType) => yScaleRight(rightAxisField.accessor(dataPoint));

    return (
      <BaseBarGraph
        width={width} height={height}
        margins={margin}
        xColourScale={xColourScale}
        xLabel={labelField.name} yLabel={leftAxisField.name}
        xScale={xScale} yScale={yScaleLeft}
        onLegendHeightUpdate={setLegendHeight}
        logScale={true}
      >
        <StyledAxis axis={AxisRight}
          label={rightAxisField.name}
          scale={yScaleRight}
          numTicks={yMax / 80}
          left={xMax + margin.left}
          top={margin.top}
          tickFormat={(data) => data.valueOf().toExponential(0)}
        />
        {data.map((d, i) => (
          <Fragment key={`bar-${i}`}>
            <BarField
              data={d} field={leftAxisField}
              x={xPoint(d) + margin.left} y={yPointLeft(d) + margin.top}
              width={xScale.bandwidth()/2} height={yMax - yPointLeft(d)}
              tooltip={tooltip ? () => tooltip(leftAxisField, d) : undefined }
            />
            <BarField
              data={d} field={rightAxisField}
              x={xPoint(d) + margin.left + xScale.bandwidth()/2} y={yPointRight(d) + margin.top}
              width={xScale.bandwidth()/2} height={yMax - yPointRight(d)}
              tooltip={tooltip ? () => tooltip(rightAxisField, d) : undefined }
            />
          </Fragment>
        ))}
      </BaseBarGraph>
    );
}
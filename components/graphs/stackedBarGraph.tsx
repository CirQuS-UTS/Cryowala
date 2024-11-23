import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { BarField, BaseBarGraph, Field, findMinMax, mustBeDefined } from "@/components/graphs/common";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { Group } from "@visx/group";

export type StackedBarGraphProps<DataPointType> = PropsWithChildren<{
  data: DataPointType[],
  width: number,
  height: number,
  yLabel: string,
  labelField: Field<DataPointType, string>,
  fields: Field<DataPointType>[],
  tooltip?: (field: Field<DataPointType>, dataPoint: DataPointType) => ReactNode,
}>

// eslint-disable-next-line max-lines-per-function
export function StackedBarGraph<DataPointType>({ data, width, height: targetHeight, yLabel, labelField, fields, tooltip }: StackedBarGraphProps<DataPointType>): ReactNode {
  const [legendHeight, setLegendHeight] = useState(0);
  const height = useMemo(() => targetHeight - legendHeight, [targetHeight, legendHeight]);

  // Define the graph dimensions and margins
  const margin = { top: 10, bottom: 50, left: 65, right: 10 };

  // Then we'll create some bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // And then scale the graph by our data
  const yDomain = findMinMax(data.map(d => fields.map(f => f.accessor(d)).reduce((a, b) => a + b, 0)));
  const xScale = scaleBand({
    range: [0, xMax],
    round: true,
    domain: data.map(labelField.accessor),
    padding: 0.4,
  });
  const xColourScale = scaleOrdinal({
    domain: fields.map(f => f.name),
    range: fields.map(f => f.colour),
  });
  const yScale = scaleLinear({
    range: [yMax, 0],
    round: true,
    domain: [0, yDomain[1] * 1.05],
  });

  const xPoint = (dataPoint: DataPointType) => mustBeDefined(xScale(labelField.accessor(dataPoint)), `Label ${labelField.accessor(dataPoint)} is not defined on the X-axis scale.`);

  return (
    <BaseBarGraph 
      width={width} height={height}
      margins={margin}
      xLabel={labelField.name} yLabel={yLabel}
      xScale={xScale} yScale={yScale}
      xColourScale={xColourScale}
      onLegendHeightUpdate={setLegendHeight}
    >
      {data.map((d, i) => {
        const total = fields.map(f => f.accessor(d)).reduce((a, b) => a + b, 0);
        let runningTotal = 0;
        return (
          <Group key={`bar-${i}`}>
            {[...fields].reverse().map((field, j) => {
              const y = yScale(total - runningTotal)?.valueOf() ?? 0;
              runningTotal += field.accessor(d);
              return (
                <BarField key={`${i}-${j}`}
                  data={d} field={field}
                  x={xPoint(d) + margin.left} y={y + margin.top}
                  width={xScale.bandwidth()}  height={yMax - y}
                  tooltip={tooltip ? () => tooltip(field, d) : undefined}
                />
              );
            })}
          </Group>
        );
      })}         
    </BaseBarGraph>
  );
}

export default StackedBarGraph;
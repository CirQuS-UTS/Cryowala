import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { BarField, BaseBarGraph, Field, boundGraphableValue, findMinMax, getAllValues, mustBeDefined } from "@/components/graphs/common";
import { scaleBand, scaleLog, scaleOrdinal } from "@visx/scale";
import { Group } from "@visx/group";

export type ClusteredBarGraphProps<DataPointType> = PropsWithChildren<{
  data: DataPointType[],
  width: number,
  height: number,
  yLabel: string,
  labelField: Field<DataPointType, string>,
  foregroundFields: Field<DataPointType>[],
  backgroundField: Field<DataPointType>,
  tooltip?: (field: Field<DataPointType>, dataPoint: DataPointType) => ReactNode,
}>

// eslint-disable-next-line max-lines-per-function
export function ClusteredBarGraph<DataPointType>({ data, width, height: targetHeight, yLabel, labelField, backgroundField, foregroundFields, tooltip }: ClusteredBarGraphProps<DataPointType>): ReactNode {
  const [legendHeight, setLegendHeight] = useState(0);
  const height = useMemo(() => targetHeight - legendHeight, [targetHeight, legendHeight]);
  
  // Define the graph dimensions and margins
  const margin = { top: 10, bottom: 50, left: 65, right: 10 };

  // Then we'll create some bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // And then scale the graph by our data
  const yDomain = findMinMax(getAllValues(data, [backgroundField.accessor, ...foregroundFields.map(f => f.accessor)]));
  const xScale = scaleBand({
    range: [0, xMax],
    round: true,
    domain: data.map(labelField.accessor),
    padding: 0.4,
  });
  const xColourScale = scaleOrdinal({
    domain: [backgroundField, ...foregroundFields].map(f => f.name),
    range: [backgroundField, ...foregroundFields].map(f => f.colour),
  });
  const yScale = scaleLog({
    range: [yMax, 0],
    round: true,
    domain: [
      boundGraphableValue(Math.pow(10, Math.floor(Math.log10(yDomain[0])))),
      Math.pow(10, Math.ceil(Math.log10(yDomain[1] * 1.05))),
    ],
  });

  const xPoint = (dataPoint: DataPointType) => mustBeDefined(xScale(labelField.accessor(dataPoint)), `Label ${labelField.accessor(dataPoint)} is not defined on the X-axis scale.`);
  const yPointBackground = (dataPoint: DataPointType) => yScale(backgroundField.accessor(dataPoint));
  const yPointsForeground = foregroundFields.map(field => (dataPoint: DataPointType) => yScale(boundGraphableValue(field.accessor(dataPoint))));

  return (
    <BaseBarGraph 
      width={width} height={height}
      margins={margin}
      xLabel={labelField.name} yLabel={yLabel}
      xScale={xScale} yScale={yScale}
      xColourScale={xColourScale}
      onLegendHeightUpdate={setLegendHeight}
      logScale={true}
    >
      {data.map((d, i) => (
        <Group key={`bar-${i}`}>
        <BarField key={`bar-${i}-${backgroundField.name}`}
          data={d} field={backgroundField}
          x={xPoint(d) + margin.left} y={yPointBackground(d) + margin.top}
          width={xScale.bandwidth()}  height={yMax - yPointBackground(d)}
          tooltip={tooltip ? () => tooltip(backgroundField, d) : undefined }
        />
        {foregroundFields.map((field, j) => (
          <BarField key={`bar-${i}-${field.name}`}
            data={d} field={field}
            x={xPoint(d) + margin.left + (xScale.bandwidth() / foregroundFields.length) * j} y={yPointsForeground[j](d) + margin.top}
            width={xScale.bandwidth() / foregroundFields.length} height={yMax - yPointsForeground[j](d)}
            tooltip={tooltip ? () => tooltip(field, d) : undefined }
          />
        ))}
      </Group>
      ))}             
    </BaseBarGraph>
  );
}

export default ClusteredBarGraph;
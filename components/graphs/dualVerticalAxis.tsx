import React from 'react';
import { AxisLeft, AxisRight, TickLabelProps } from "@visx/axis";
import { TextProps } from '@visx/text/lib/Text';

export type DualVerticalAxisProps = {
    directionality: ("left" | "right"),
    thirdAxis: boolean,
    scale: any,
    label: string,
    labelProps?: Partial<TextProps>,
    majorTicks: number[],
    minorTicks: number[],
    majorTickFormat: (d: any) => string,
    minorTickFormat?: (d: any) => string,
    tickLabelProps?: TickLabelProps<unknown>
    majorTickLength?: number,
    minorTickLength?: number,
    offset?: number
    thirdAxisTicks?: number[],
    thirdAxisTickLength?: number,
    thirdAxisTickFormat?: (d: any) => string,
}

// eslint-disable-next-line max-lines-per-function
export default function DualVerticalAxis({
    directionality,
    thirdAxis,
    scale,
    label,
    labelProps = {},
    majorTicks,
    minorTicks,
    majorTickFormat,
    minorTickFormat = () => "",
    tickLabelProps = {},
    majorTickLength = 8,
    minorTickLength = 4,
    offset = 0,
    thirdAxisTicks = [],
    thirdAxisTickLength = 4,
    thirdAxisTickFormat = () => "",
}: DualVerticalAxisProps) {
    return (
        <>
            {directionality == 'left' && <>
                <AxisLeft
                    scale={scale}
                    label={label}
                    labelProps={labelProps}
                    tickValues={majorTicks}
                    tickFormat={majorTickFormat}
                    tickLength={majorTickLength}
                    left={offset}
                    tickLabelProps={tickLabelProps}
                />
                <AxisLeft
                    scale={scale}
                    tickValues={minorTicks}
                    tickFormat={minorTickFormat}
                    tickLength={minorTickLength}
                    left={offset}
                    tickLabelProps={tickLabelProps}
                />
                {(thirdAxis) && <AxisLeft
                    scale={scale}
                    tickValues={thirdAxisTicks}
                    tickFormat={thirdAxisTickFormat}
                    tickLength={thirdAxisTickLength}
                    left={offset}
                    tickLabelProps={tickLabelProps}
                />}
            </>}
            {directionality == 'right' && <>
                <AxisRight
                    scale={scale}
                    label={label}
                    labelProps={labelProps}
                    tickValues={majorTicks}
                    tickFormat={majorTickFormat}
                    tickLength={majorTickLength}
                    left={offset}
                    tickLabelProps={tickLabelProps}
                />
                <AxisRight
                    scale={scale}
                    tickValues={minorTicks}
                    tickFormat={minorTickFormat}
                    tickLength={minorTickLength}
                    left={offset}
                    tickLabelProps={tickLabelProps}
                />
                {(thirdAxis) && <AxisRight
                    scale={scale}
                    tickValues={thirdAxisTicks}
                    tickFormat={thirdAxisTickFormat}
                    tickLength={thirdAxisTickLength}
                    left={offset}
                    tickLabelProps={tickLabelProps}
                />}
            </>}
        </>
    )
}
import React from 'react';
import { Group } from "@visx/group";
import { Polygon } from "@visx/shape";

export type ColourBarProps = {
    top: number,
    height: number,
    left: number,
    right: number,
    colourInterp: (t: number) => string
}

// eslint-disable-next-line max-lines-per-function
export default function ColourBar({ top, height, left, right, colourInterp }: ColourBarProps) {
    const layers: [number, number][][] = [];
    for (let i = 0; i < height; i++) {
        layers.push([
            [left, top + i],
            [right, top + i],
            [right, top + i + 1],
            [left, top + i + 1],
        ])
    }
    return (
        <Group key={'colour-bar-colour-scale'}>
            {layers.map((l, i) =>
                <Polygon key={'colour-bar-element-' + i}
                    points={l}
                    fill={colourInterp(1 - ((top + i) / height))}
                />
            )}
        </Group>
    )
}
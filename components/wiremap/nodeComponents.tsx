export type NodeTextProps = JSX.IntrinsicElements['text'] & {
  colour: string;
  lines: string[];
};
export function NodeText({ colour, lines, ...props }: NodeTextProps) {
  return (
    <text
      fontSize={16}
      textAnchor="middle"
      fill={colour}
      {...props}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={0} y={`${(i + 1 - 0.15) - lines.length / 2}em`}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export type NodeBoxProps = JSX.IntrinsicElements['rect'] & {
  width: number;
  height: number;
  title?: string;
};
export function NodeBox({ width, height, title, ...props }: NodeBoxProps) {
  return (
    <rect
      width={width}
      height={height}
      y={-height / 2}
      x={-width / 2}
      rx={Math.min(width, height) / 4}
      strokeWidth={1}
      {...props}
    >
      <title>{title}</title>
    </rect>
  );
}
import { Input, InputProps } from "@/components/inputs/single_value/common";

export type NumberProps = Omit<InputProps<number>, "valueToString" | "stringToValue"> & {
  min?: number,
  max?: number,
  step?: number,
}
export default function Number({ min, max, step, ...props }: NumberProps) {
  return (
    <Input
      type="number"
      valueToString={(value) => value.toString()}
      stringToValue={(str) => parseFloat(str)}
      min={min}
      max={max}
      step={step}
      {...props}
    />
  );
}
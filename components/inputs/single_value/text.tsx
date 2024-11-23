import { Input, InputProps, LabelledInput } from "@/components/inputs/single_value/common";

export type TextProps = Omit<InputProps<string>, "valueToString" | "stringToValue">;
export default function Text({ ...props }: TextProps) {
  return (
    <Input
      type="text"
      valueToString={(value) => value}
      stringToValue={(str) => str}
      {...props}
    />
  );
}
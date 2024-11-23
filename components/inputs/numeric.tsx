import { ReactNode } from "react";
import { InputColumn, InputColumnProps } from "@/components/inputs/default";

export const numberToFormattedString = (num: number, digits: number = 5) => {
  if (num === 0) {
    return "0";
  } else if (num <= Math.pow(10, -(digits - 1)) || num >= Math.pow(10, digits)) {
    return num.toExponential();
  } else {
    return num.toString();
  }
}

export type NumericInputColumnProps<T> = Omit<InputColumnProps<T>, "valueGetter" | "valueSetter"> & {
  valueGetter: (item: T) => number,
  valueSetter: (index: number, item: T, value: number) => void,
};
export function NumericInputColumn<T>({ valueGetter, valueSetter, ...props}: NumericInputColumnProps<T>): ReactNode {
  const valueGetterString = (item: T) => numberToFormattedString(valueGetter(item));
  const valueSetterString = (index: number, item: T, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      throw new Error(`'${value}' is not a number`);
    } else {
      valueSetter(index, item, numValue);
    }
  }

  return (
    <InputColumn<T>
      valueGetter={valueGetterString} valueSetter={valueSetterString} 
      onWheel={(event) => event.currentTarget.blur()}
      type="number" min={0} step="any"
      {...props}
    />
  );
}
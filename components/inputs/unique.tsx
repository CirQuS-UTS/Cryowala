import { ReactNode } from "react";
import { InputColumn, InputColumnProps } from "@/components/inputs/default";

export type UniqueInputColumnProps<T> = InputColumnProps<T> & {
    isUnique: (value: string) => boolean,
  }
  export function UniqueInputColumn<T>({ isUnique, valueSetter, ...props }: UniqueInputColumnProps<T>): ReactNode {
    const valueSetterUnique = (index: number, item: T, value: string) => {
      if (isUnique(value)) {
        valueSetter(index, item, value);
      } else {
        throw new Error(`'${value}' is not unique`);
      }
    }
  
    return (
      <InputColumn<T> valueSetter={valueSetterUnique} {...props} />
    );
  }
  
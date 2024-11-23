import { ReactNode } from "react";
import styles from "@/components/config/Config.module.css";

export type SelectColumnProps<T> = JSX.IntrinsicElements["select"] & {
  label: string,
  data: T[],
  valueGetter: (item: T) => string,
  valueSetter: (index: number, item: T, value: string) => void,
  options: string[],
  tooltip?: string,
}
export function SelectColumn<T>({ label, tooltip = undefined, data, valueGetter, valueSetter, options, ...props }: SelectColumnProps<T>): ReactNode {
  return (
    <label className={styles.LABEL}>
      <h1 title={tooltip} style={{ textDecoration: 'underline dotted' }}>{label}</h1>
      {data.map((item: T, index: number) => (
        <div key={index} className="px-1">
          <select className={[styles.SELECT, (options.includes(valueGetter(item)) ? styles.VALID_INPUT : styles.INVALID_INPUT)].join(" ")}
            value={valueGetter(item)} onChange={(event) => valueSetter(index, item, event.target.value)}
            {...props}
          >
            {options.includes(valueGetter(item)) ? null : <option value={valueGetter(item)}>{valueGetter(item)}</option>}
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      ))}
    </label>
  );
}
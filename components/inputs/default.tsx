import { ReactNode, useEffect, useState } from "react";
import styles from "@/components/config/Config.module.css";

export type InputColumnProps<T> = JSX.IntrinsicElements["input"] & {
  label: string,
  data: T[],
  valueGetter: (item: T) => string,
  valueSetter: (index: number, item: T, value: string) => void,
  propGenerator?: (index: number, item: T, value: string) => JSX.IntrinsicElements["input"],
  tooltip?: string,
}
export function InputColumn<T>({ label, tooltip = undefined, data, valueGetter, valueSetter, propGenerator, ...props }: InputColumnProps<T>): ReactNode {
  // no text wrap on label
  return (
    <label className={styles.LABEL}>
      <h1 title={tooltip} style={{ textDecoration: 'underline dotted' }}>{label}</h1>
      {data.map((item: T, index: number) => (
        <div key={index} className="px-1">
          <InputCell<T> datum={item}
            valueGetter={valueGetter} valueSetter={(datum, value) => valueSetter(index, datum, value)}
            type="text"
            propGenerator={propGenerator ? (datum, value) => propGenerator(index, datum, value) : undefined}
            {...props}
          />
        </div>
      ))}
    </label>
  );
}

export type InputCellProps<T> = JSX.IntrinsicElements["input"] & {
  datum: T,
  valueGetter: (item: T) => string,
  valueSetter: (item: T, value: string) => void,
  propGenerator?: (item: T, value: string) => JSX.IntrinsicElements["input"],
}
// eslint-disable-next-line max-lines-per-function
export function InputCell<T>({ datum, valueGetter, valueSetter, propGenerator, ...props }: InputCellProps<T>): ReactNode {
  const [value, setValue] = useState(valueGetter(datum));
  const [isValid, setIsValid] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(true);

  const additonalProps = propGenerator ? propGenerator(datum, value) : {};

  useEffect(() => {
    setValue(valueGetter(datum));
  }, [datum, valueGetter]);

  const valueSetterWrapper = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);

    if (event.target.value === "") {
      setIsValid(false);
      return;
    }

    try {
      // valueSetter(datum, event.target.value);
      setIsValid(true);
      setIsConfirmed(false);
    } catch (e: any) {
      setIsValid(false);
    }
  };

  const valueSetterApply = (value: string) => {
    try {
      valueSetter(datum, value);
      setIsConfirmed(true);
    } catch (e: any) { }
  }

  const applyOnEnter = (keyEvent: React.KeyboardEvent<HTMLInputElement>) => {
    if (keyEvent.key === "Enter") {
      valueSetterApply(keyEvent.currentTarget.value);
      setIsConfirmed(true);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }
  }

  return (
    <input className={[styles.INPUT, styles[isValid ? (isConfirmed ? "VALID_INPUT" : "UNCONFIRMED_INPUT") : "INVALID_INPUT"]].join(" ")}
      value={value} onChange={valueSetterWrapper}
      onBlur={(event) => valueSetterApply(event.target.value)}
      onKeyDown={applyOnEnter}
      required={true}
      {...props}
      {...additonalProps}
    />
  );
}
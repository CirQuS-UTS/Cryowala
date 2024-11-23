import { InputHTMLAttributes, PropsWithChildren } from "react";

export type InputLabelProps = {
  label: string,
  rounded?: boolean,
  shadow?: boolean,
}
// eslint-disable-next-line max-lines-per-function
export function LabelledInput({ label, rounded, shadow, children }: PropsWithChildren<InputLabelProps>) {
  return (
    <div className={[
      "w-full",
      rounded ? "rounded-lg" : "",
      shadow ? "shadow-radial shadow-zinc-500" : ""
    ].join(" ")}>
      <label className={[
        "inline-block w-1/2 text-white bg-zinc-800 p-2 overflow-clipped whitespace-nowrap",
        rounded ? "rounded-l-lg" : ""
      ].join(" ")}
      >
        {label}
      </label>
      <div className={[
        "inline-block w-1/2",
        rounded ? "rounded-r-lg" : ""
      ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}

export type InputProps<T = string> = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string,
  value: T,
  onChange: (value: T) => void,
  rounded?: boolean,
  shadow?: boolean,

  valueToString: (value: T) => string,
  stringToValue: (str: string) => T,
}
export function Input<T = string>({ label, value, onChange, rounded, shadow, valueToString, stringToValue, className, ...props }: InputProps<T>) {
  return (
    <LabelledInput
      label={label}
      rounded={rounded}
      shadow={shadow}
    >
      <input
        className={[
          "w-full text-zinc-800 bg-white p-2",
          rounded ? "rounded-r-lg" : "",
          className ?? "",
        ].join(" ")}
        value={valueToString(value)}
        onChange={(e) => onChange(stringToValue(e.target.value))}
        {...props}
      />
    </LabelledInput>
  );
}
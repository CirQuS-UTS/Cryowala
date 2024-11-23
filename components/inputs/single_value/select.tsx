import { LabelledInput } from "@/components/inputs/single_value/common";

export interface SelectProps {
  type?: "dropdown" | "segmented"
  label: string,
  options: string[],
  value: string,
  onChange: (value: string, index: number) => void,
  rounded?: boolean,
  shadow?: boolean,
  disable?: boolean
}
// eslint-disable-next-line max-lines-per-function
export default function Select({ type = "dropdown", value, onChange, disable, ...props }: SelectProps) {
  if (type === "segmented") {
    return (
      <SegmentedSelect
        selected={props.options.map(opt => opt === value)}
        disabled={props.options.map(opt => opt === value)}
        onClick={onChange}
        {...props}
      />
    );
  } else if (type === "dropdown") {
    return (
      <DropdownSelect
        value={value}
        onChange={onChange}
        disable={disable}
        {...props}
      />
    );
  } else {
    throw new Error(`Unknown select type: ${type}`);
  }
}

export type SegmentedSelectProps = {
  label: string,
  options: string[],
  selected?: boolean[],
  disabled?: boolean[],
  onClick: (value: string, index: number) => void,
  rounded?: boolean,
  shadow?: boolean,
}
// eslint-disable-next-line max-lines-per-function
export function SegmentedSelect({ label, options, selected, disabled, onClick, rounded, shadow }: SegmentedSelectProps) {
  return (
    <div className={[
      "w-full",
      rounded ? "rounded-lg" : "",
      shadow ? "shadow-radial shadow-zinc-500" : "",
    ].join(" ")}>
      {label && (
        <p className={[
          "text-center text-white bg-zinc-800 p-2",
          rounded ? "rounded-t-lg" : "",
        ].join(" ")}>
          {label}
        </p>
      )}
      <ul className={["flex bg-zinc-900 w-full", rounded ? "rounded-lg" : ""].join(" ")}>
        {options.map((option, index) => (
          <SelectSegment
            key={index}
            name={option}
            width={100 / options.length}
            selected={selected ? selected[index] : false}
            first={index === 0}
            last={index === options.length - 1}
            onClick={(value) => onClick(value, index)}
            rounded={rounded}
            hasLabel={label ? true : false}
            disabled={disabled ? disabled[index] : false}
          />
        ))}
      </ul>
    </div>
  );
}

interface SelectSegementProps {
  name: string,
  width: number,
  selected?: boolean,
  disabled?: boolean,
  first: boolean,
  last: boolean,
  onClick: (value: string) => void,
  rounded?: boolean,
  hasLabel?: boolean,
}
// eslint-disable-next-line max-lines-per-function
function SelectSegment({ name, width, selected, first, last, onClick, disabled, rounded, hasLabel }: SelectSegementProps) {
  const firstClass = hasLabel ? "rounded-bl-lg" : "rounded-l-lg";
  const lastClass = hasLabel ? "rounded-br-lg" : "rounded-r-lg";
  return (
    <li
      className={[
        "inline-block p-2 text-center",
        disabled ? "cursor-default" : "cursor-pointer",
        selected ? "text-black bg-sky-400" : "text-zinc-800 bg-white hover:bg-zinc-200",
        !last ? "border-r-2 border-zinc-800" : "",
        first && rounded ? firstClass : "",
        last && rounded ? lastClass : "",
      ].join(" ")}
      style={{
        width: `${width}%`,
      }}
      onClick={disabled ? undefined : () => onClick(name)}
    >
      {name}
    </li>
  );
}

type DropdownSelectProps = Omit<SelectProps, "type">;
// eslint-disable-next-line max-lines-per-function
function DropdownSelect({ label, options, value, onChange, rounded, shadow, disable }: DropdownSelectProps) {
  return (
    <LabelledInput
      label={label}
      rounded={rounded}
      shadow={shadow}
    >
      <select
        className={[
          "w-full p-2 text-zinc-800 bg-white",
          rounded ? "rounded-r-lg" : ""
        ].join(" ")}
        value={value}
        onChange={(event) => onChange(event.target.value, options.indexOf(event.target.value))}
        disabled={disable}
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </LabelledInput>
  );
}
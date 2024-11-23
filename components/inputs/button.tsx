import { ReactNode, useRef } from "react";
import styles from "@/components/config/Config.module.css";


export type ButtonColumnProps<T> = Omit<JSX.IntrinsicElements["button"], "onClick"> & {
  label: string,
  message: string,
  data: T[],
  onClick: (index: number, item: T) => void,
  tooltip?: string,
}
export function ButtonColumn<T>({ label, tooltip, message, data, onClick, ...props }: ButtonColumnProps<T>): ReactNode {
  return (
    <label className={styles.LABEL}>
      <h1 title={tooltip} style={{ textDecoration: 'underline dotted' }}>{label}</h1>
      {data.map((item: T, index: number) => (
        <div key={index} className="px-1">
          <button className={[styles.BUTTON, styles.INPUT].join(" ")}
            onClick={() => onClick(index, item)}
            {...props}
          >
            {message}
          </button>
        </div>
      ))}
    </label>
  );
}

export type UploadButtonColumnProps<T> = Omit<JSX.IntrinsicElements["button"], "onClick"> & {
  label: string,
  message: string,
  data: T[],
  onClick: (event: React.ChangeEvent<HTMLInputElement>, index: number) => void,
  tooltip?: string,
}
// eslint-disable-next-line max-lines-per-function
export function UploadButtonColumn<T>({ label, tooltip, message, data, onClick, ...props }: UploadButtonColumnProps<T>): ReactNode {

  const inputRef = useRef<Map<number, HTMLInputElement>>(new Map());

  const t = new Map()

  const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    try {
      onClick(event, index)
    } catch (err) {
      console.error(err);
    } finally {
      const reference = inputRef.current.get(index) ?? null;
      if (reference != null) reference.value = '';
    }
  }

  return (
    <label className={styles.LABEL}>
      <h1 title={tooltip} style={{ textDecoration: 'underline dotted' }}>{label}</h1>
      {data.map((item: T, index: number) => (
        <div key={index} className="px-1">
          <input
            type="file"
            ref={(node) => { if (node) inputRef.current.set(index, node) }}
            hidden={true}
            onChange={(event) => onFileSelected(event, index)}
          />
          <button className={[styles.BUTTON, styles.INPUT].join(" ")}
            onClick={() => inputRef?.current?.get(index)?.click()}
            {...props}
          >
            {message}
          </button>
        </div>
      ))}
    </label>
  );
}
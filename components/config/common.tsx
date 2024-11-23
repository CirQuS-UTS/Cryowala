import { PropsWithChildren, ReactNode } from "react";
import { ButtonColumn, ButtonColumnProps } from "@/components/inputs/button";
import styles from "@/components/config/Config.module.css";

export type DeleteButtonColumnProps<T> = Omit<ButtonColumnProps<T>, "message">
export function DeleteButtonColumn<T>({ data, label, onClick, style, ...props }: DeleteButtonColumnProps<T>): ReactNode {
  // Note(mitch): There is almost certainly a race condition during deletions,
  // which causes more than one onClick to be triggered at once. Putting a delay here seems to fix it.
  // I don't have more time to debug this right now. So hacky solution it will stay for now.
  return (
    <ButtonColumn<T>
      label={`Remove ${label}`}
      message="Delete"
      data={data} onClick={(...args) => setTimeout(() => onClick(...args), 100)}
      style={{ backgroundColor: "#ff6b6b", ...style }}
      {...props}
    />
  );
}

export type FormSectionProps = PropsWithChildren<{
}>;
export function FormSection({ children }: FormSectionProps): JSX.Element {
  return (
    <div className={styles.CONFIGUREBOX}>
      {children}
    </div>
  );
}

export type FormGroupProps = PropsWithChildren<{
  title: string,
  tooltip?: string,
  buttonLabel?: string,
  buttonTooltip?: string,
  onAddClicked?: () => void
}>;
export function FormGroup({ title, tooltip, buttonLabel, buttonTooltip, onAddClicked, children }: FormGroupProps): JSX.Element {
  return (
    <>
      <div className="flex flex-row justify-between">
        <h1 className={styles.HEADING} title={tooltip} style={{ textDecoration: 'underline dotted' }}>{title}</h1>
        {onAddClicked && buttonLabel &&
          <button className={styles.BUTTON} title={buttonTooltip} onClick={onAddClicked} style={{ padding: "0 2.5em", margin: "0", textDecoration: 'underline dotted' }}>
            {buttonLabel}
          </button>
        }
      </div>
      <div className="flex flex-row ">
        {children}
      </div>
    </>
  );
}

export function findNextId(items: { id: string }[], prefix: string): string {
  let name: string = prefix;

  let i = 1;
  while (items.some((item) => item.id === name)) {
    name = `${prefix} ${i}`;
    i++;
  }

  return name;
}
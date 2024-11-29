import styles from "@/components/config/Config.module.css";
import { useRef } from "react";

export type UploadCSVButtonProps = Omit<JSX.IntrinsicElements["button"], "onClick"> & {
    label: string,
    message: string,
    onClick: (event: React.ChangeEvent<HTMLInputElement>) => void,
    tooltip?: string,
}
// eslint-disable-next-line max-lines-per-function
export function UploadCSVButton({ label, tooltip, message, onClick, ...props }: UploadCSVButtonProps): React.ReactNode {

    const inputRef = useRef<HTMLInputElement>(null);

    const onFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            onClick(event)
        } catch (err) {
            console.error(err);
        } finally {
            const reference = inputRef.current ?? null;
            if (reference != null) reference.value = '';
        }
    }

    return (
        <div className={'flex flex-row w-full justify-center items-center'}>
            <input
                type="file"
                ref={inputRef}
                hidden={true}
                onChange={onFileSelected}
            />
            <button className={[styles.BUTTON].join(" ")}
                onClick={() => inputRef?.current?.click()}
                {...props}
            >
                {message}
            </button>
        </div>
    );
}
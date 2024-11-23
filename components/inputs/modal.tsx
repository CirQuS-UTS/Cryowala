import { PropsWithChildren } from "react";

export type ModalProps = {
    showModal: boolean,
    closeModal: () => void,
    innerStyle: string,
    outerWidth?: number,
    outerHeight?: number
}

// eslint-disable-next-line max-lines-per-function
export default function Modal({
    showModal,
    closeModal,
    innerStyle,
    outerWidth,
    outerHeight,
    children
}: PropsWithChildren<ModalProps>) {
    return (
        <>
            {showModal &&
                <div
                    style={{ width: outerWidth ?? '100%', height: outerHeight ?? '100%' }}
                    className={"flex flex-col absolute justify-center items-center bg-black bg-opacity-70 z-50"}
                    onClick={closeModal}
                >
                    <div
                        className={innerStyle}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </div>
                </div>
            }
        </>
    );
}
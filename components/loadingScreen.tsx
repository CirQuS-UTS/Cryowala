import { PropsWithChildren } from "react";

type LoadingScreenProps = {
    status?: string;
    backgroundColour?: string;
    textColour?: string;
}

export function LoadingScreen({ status, backgroundColour = 'bg-white', textColour = 'text-zinc-800' }: PropsWithChildren<LoadingScreenProps>) {
    return (
        <div className={`flex flex-col justify-around items-center w-full h-full ${backgroundColour}`}>
            <div className="flex flex-col items-center gap-10">
                {status && <h3 className={`text-3xl ${textColour}`}>{status}</h3>}
                <Spinner />
            </div>
        </div>
    )
}

function Spinner() {
    return (
        <div className="animate-spin">
            <div className="rounded-full h-32 w-32 border-l-8 border-sky-500">
                <div className="rounded-full m-2 h-28 w-28 border-b-8 border-orange-500">
                    <div className="rounded-full m-2 h-24 w-24 border-l-8 border-yellow-500">
                        <div className="rounded-full m-2 h-20 w-20 border-t-8 border-green-500">

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
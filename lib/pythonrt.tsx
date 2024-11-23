"use client";

import { LoadingScreen } from "@/components/loadingScreen";
import { loadPyodide, PyodideInterface } from "pyodide";
import { createContext, PropsWithChildren, ReactNode, useContext, useEffect, useMemo, useState } from "react";

export class PythonRuntime {
    pyodide: PyodideInterface | null;
    loaded: boolean;
    error: string | null;

    constructor(pyodide: PyodideInterface | null, error: string | null, loaded: boolean = false) {
        this.pyodide = pyodide;
        this.loaded = pyodide !== null;
        this.error = null;
    }

    get ready(): boolean {
        return (
            this.loaded &&
            this.error === null &&
            this.pyodide !== null
        )
    }

    run(code: string): any {
        if (!this.ready) {
            throw new Error("python runtime not ready");
        }

        return this.pyodide!.runPython(code);
    }

    runAsync(code: string): Promise<any> {
        if (!this.ready) {
            return Promise.reject(new Error("python runtime not ready"));
        }

        return this.pyodide!.runPythonAsync(code);
    }

    runJSON(code: string): any {
        return JSON.parse(this.run(code));
    }

    runJSONAsync(code: string): Promise<any> {
        return this.runAsync(code).then((output) => JSON.parse(output));
    }
}

const PythonRunTimeContext = createContext<PythonRuntime | null>(null);

// eslint-disable-next-line max-lines-per-function
export function PythonRuntimeProvider({ children }: PropsWithChildren): JSX.Element {
    const [loaded, setLoaded] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);

    const complete = (pyodide: PyodideInterface) => {
        setLoaded(true);
        setPyodide(pyodide);
    };
    const fail = (err: Error) => {
        setLoaded(true);
        setError(err.message);
    };

    useEffect(() => {
        if (loaded) return; // don't load again

        loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" })
            .then(async (pyodide) => {
                await pyodide.loadPackage("micropip");
                const micropip = pyodide.pyimport("micropip");
                await micropip.install(`${process.env.BASE_PATH}/CryowalaCore-0.1-py3-none-any.whl`);
                complete(pyodide);
            })                
            .catch(fail);
    }, [loaded]);

    const rt = useMemo(() => new PythonRuntime(pyodide, error, loaded), [pyodide, error, loaded]);

    return (
        <PythonRunTimeContext.Provider value={rt}>
            {children}
        </PythonRunTimeContext.Provider>
    );
}

export function usePythonRuntime(): PythonRuntime {
    const rt = useContext(PythonRunTimeContext);

    if (rt === null) {
        throw new Error("no python runtime provided, try wrapping your component with PythonRuntimeProvider");
    }

    if (!rt.ready) {
        throw new Error("python runtime not ready, try wrapping your component with WithPythonRuntime");
    }

    return rt;
}

export function WithPythonRuntime({ children }: PropsWithChildren): ReactNode {
    const rt = useContext(PythonRunTimeContext);

    if (rt === null)
        return <div>no python runtime provided</div>;

    if (!rt.loaded)
        return <LoadingScreen status="Loading Python Runtime..." />

    if (rt.error !== null)
        return <div>error loading python runtime: {rt.error}</div>;

    if (!rt.ready)
        return <div>unexpected error: python runtime not available, but loaded with no error</div>;

    return children;
}

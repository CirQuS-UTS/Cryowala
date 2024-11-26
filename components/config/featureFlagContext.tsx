"use client"

import { createContext, FC, PropsWithChildren, useContext, useEffect, useState } from "react";

export type FeatureFlags = {
    staticStageCount: boolean
}

const featureFlagsContext = createContext<FeatureFlags>({ staticStageCount: true });
export const useFeatureFlags = () => useContext(featureFlagsContext);

export const FeatureFlagProvider: FC<PropsWithChildren> = ({ children }) => {

    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
        staticStageCount: true
    });

    useEffect(() => {
        fetch('https://api.codeishot.com/api/snippets/3HkvbQMD/')
            .then(response => response.json())
            .then(data => JSON.parse(data.code))
            .then(flags => setFeatureFlags(flags))
            .catch(err => console.warn("Unable to retrieve feature flags: ", err))
    }, []);

    return (
        <featureFlagsContext.Provider value={featureFlags}>
            {children}
        </featureFlagsContext.Provider>
    );
}
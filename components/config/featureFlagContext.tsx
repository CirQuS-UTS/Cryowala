"use client"

import { createContext, FC, PropsWithChildren, useContext, useEffect, useState } from "react";

export type FeatureFlags = {
    staticStageCount: boolean
};

const defaultConfiguration: FeatureFlags = {
    staticStageCount: true
};

const FeatureFlagsContext = createContext<FeatureFlags>(defaultConfiguration);

export const useFeatureFlags = () => useContext(FeatureFlagsContext);

export const FeatureFlagProvider: FC<PropsWithChildren> = ({ children }) => {

    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(defaultConfiguration);

    useEffect(() => {
        fetch('https://api.codeishot.com/api/snippets/3HkvbQMD/')
            .then(response => response.json())
            .then(data => JSON.parse(data.code))
            .then(flags => setFeatureFlags(flags))
            .catch(err => console.warn("Unable to retrieve feature flags: ", err))
    }, []);

    return (
        <FeatureFlagsContext.Provider value={featureFlags}>
            {children}
        </FeatureFlagsContext.Provider>
    );
}
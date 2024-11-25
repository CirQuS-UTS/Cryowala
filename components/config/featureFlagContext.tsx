"use client"

import { createContext, FC, PropsWithChildren, useContext, useState } from "react";

type FeatureFlags = {
    limitStages: boolean
}

const featureFlagsContext = createContext<FeatureFlags>({ limitStages: true });
export const useFeatureFlags = () => useContext(featureFlagsContext);

export const FeatureFlagProvider: FC<PropsWithChildren> = ({ children }) => {

    const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
        limitStages: true
    });

    return (
        <featureFlagsContext.Provider value={featureFlags}>
            {children}
        </featureFlagsContext.Provider>
    );
}
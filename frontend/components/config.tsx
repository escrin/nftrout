import React from "react";
import { DataProvider } from "@plasmicapp/loader-nextjs";

const PLASMIC_DATA_KEY = "Config";

interface ConfigData {
  graphUrl?: string;
}

export interface ConfigProps {
  className?: string; // Plasmic CSS class
  children?: React.ReactNode;
}

export function Config(props: ConfigProps) {
  const { className, children } = props;
  const data: ConfigData = {
  };
  return (
    <div className={className}>
      <DataProvider name={PLASMIC_DATA_KEY} data={data}>
        {children}
      </DataProvider>
    </div>
  );
}

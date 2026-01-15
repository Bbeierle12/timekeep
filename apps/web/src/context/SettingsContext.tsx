import { createContext, useContext } from 'react';

export type SettingsContextValue = {
  timezone: string;
};

export const SettingsContext = createContext<SettingsContextValue>({
  timezone: 'America/Los_Angeles'
});

export function useSettingsContext() {
  return useContext(SettingsContext);
}

import { createContext, useContext } from 'react';

export type ReminderContextValue = {
  pending: string[];
};

export const ReminderContext = createContext<ReminderContextValue>({
  pending: []
});

export function useReminderContext() {
  return useContext(ReminderContext);
}

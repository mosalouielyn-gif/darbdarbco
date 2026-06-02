import { createContext, ReactNode, useContext } from "react";
import { AppData } from "./api";

interface AppDataContextValue {
  data: AppData | null;
  loading: boolean;
  error: string;
}

const AppDataContext = createContext<AppDataContextValue>({
  data: null,
  loading: false,
  error: "",
});

export function AppDataProvider({ value, children }: { value: AppDataContextValue; children: ReactNode }) {
  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  return useContext(AppDataContext);
}

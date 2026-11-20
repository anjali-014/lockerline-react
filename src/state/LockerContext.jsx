import { createContext, useContext, useState } from 'react';

// What every screen shares: which resident is using the app.
const LockerContext = createContext(null);

export function LockerProvider({ children }) {
  const [residentFlat, setResidentFlat] = useState('302');

  const value = { residentFlat, setResidentFlat };
  return <LockerContext.Provider value={value}>{children}</LockerContext.Provider>;
}

export function useLocker() {
  return useContext(LockerContext);
}


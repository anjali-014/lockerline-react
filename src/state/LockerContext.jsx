import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// What every screen shares: which resident is using the app, the time the screens show, and a version
// that moves on whenever the data may have changed, so the screens ask the backend again.
const LockerContext = createContext(null);

export function LockerProvider({ children }) {
  const [residentFlat, setResidentFlat] = useState('302');
  const [now, setNow] = useState(Date.now);
  const [version, setVersion] = useState(0);

  /** The data may have changed: every screen reads its data again, as a real frontend refetches. */
  const changed = useCallback(() => {
    setNow(Date.now());
    setVersion((v) => v + 1);
  }, []);

  // Time passes while the page is open, so waiting times grow on their own.
  useEffect(() => {
    const timer = setInterval(changed, 20_000);
    return () => clearInterval(timer);
  }, [changed]);

  const value = { residentFlat, setResidentFlat, now, version };
  return <LockerContext.Provider value={value}>{children}</LockerContext.Provider>;
}

export function useLocker() {
  return useContext(LockerContext);
}

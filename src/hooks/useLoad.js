import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLocker } from '../state/LockerContext.jsx';

/**
 * Runs `load` (an async function that asks the backend) and gives back what it returned: null until the
 * first answer arrives. It runs again whenever one of `deps` changes and whenever the data changes; until
 * the new answer arrives, the screen keeps showing the last one.
 */
export function useLoad(load, deps) {
  const { version } = useLocker();
  const [value, setValue] = useState(null);

  useEffect(() => {
    let current = true;
    load().then((result) => {
      if (current) setValue(result);
    });
    return () => {
      current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, ...deps]);

  return value;
}

/** The answer { status, body } to GET `path`, or null until it arrives. */
export function useGet(path) {
  return useLoad(() => api.get(path), [path]);
}

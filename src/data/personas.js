// The people in LockerLine's stories. Each one sees their own screens.
export const PERSONAS = [
  {
    id: 'caretaker', name: 'Farida', role: 'Caretaker', color: '#0f766e',
    blurb: 'Runs the parcel room. Sees every locker, every parcel and the rules the wall follows.',
    nav: [
      { to: '/caretaker/wall', label: 'The wall', icon: 'grid' },
      { to: '/caretaker/parcels', label: 'Parcels', icon: 'box' },
    ],
  },
  {
    id: 'courier', name: 'Imran', role: 'Courier', color: '#d9480f',
    blurb: 'Arrives with a bag of parcels. Asks for a locker by size and flat, and gets one.',
    nav: [{ to: '/courier', label: 'Drop-off' }],
  },
  {
    id: 'resident', name: 'Mrs Rao', role: 'Resident', color: '#4c51bf',
    blurb: 'Gets a code when a parcel arrives. Keys it in at the lobby and the locker opens.',
    nav: [
      { to: '/resident', label: 'My parcels', icon: 'box' },
      { to: '/resident/collect', label: 'Collect', icon: 'key' },
    ],
  },
];

/** The persona whose screens the path belongs to, e.g. '/caretaker/wall' → Farida. */
export function personaForPath(pathname) {
  const first = pathname.split('/')[1];
  const byRoute = { caretaker: 'caretaker', courier: 'courier', resident: 'resident' };
  return PERSONAS.find((p) => p.id === byRoute[first]) ?? null;
}

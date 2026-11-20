import { NavLink, useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { PERSONAS } from '../data/personas.js';
import { useLoad } from '../hooks/useLoad.js';
import { waitingFor } from '../state/inbox.js';
import { useLocker } from '../state/LockerContext.jsx';
import Icon from './Icon.jsx';

/**
 * The sections of a person with more than one screen (the caretaker, the resident), shown in the
 * page's title row. The current one is filled with the person's colour; a badge counts what is
 * waiting there. The resident's "Collect" shows while one of their parcels is in a locker or while they are on it.
 */
export default function SectionTabs({ personaId }) {
  const { pathname } = useLocation();
  const { residentFlat } = useLocker();
  const persona = PERSONAS.find((p) => p.id === personaId);

  // The badges: the resident's parcels still in a locker, the caretaker's lockers holding a parcel.
  const counts = useLoad(async () => {
    if (personaId === 'resident') return { waiting: (await waitingFor(residentFlat)).length, holding: 0 };
    const holding = await api.get('/towers/A/doors?state=holding');
    return { waiting: 0, holding: holding.status === 200 ? holding.body.doors.length : 0 };
  }, [personaId, residentFlat]);

  const waiting = counts?.waiting ?? 0;
  const badges = { '/caretaker/parcels': counts?.holding ?? 0, '/resident/collect': waiting };

  const items = persona.nav
    .filter((item) => item.to !== '/resident/collect' || waiting > 0 || pathname === '/resident/collect');
  // One section is not a choice: nothing is shown until there is somewhere else to go.
  if (items.length < 2) return null;

  return (
    <nav className="section-tabs" aria-label={`${persona.name}'s screens`} style={{ '--persona': persona.color }}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={items.some((o) => o.to.startsWith(`${item.to}/`))}
          className={({ isActive }) => `section-tab${isActive ? ' is-active' : ''}`}
        >
          <Icon name={item.icon} size={17} strokeWidth={2} />
          <span>{item.label}</span>
          {badges[item.to] > 0 && <span className="section-tab-badge">{badges[item.to]}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

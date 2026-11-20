import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BUILDING, RESIDENTS, residentOf } from '../data/building.js';
import { PERSONAS, personaForPath } from '../data/personas.js';
import { useLoad } from '../hooks/useLoad.js';
import { waitingFor } from '../state/inbox.js';
import { useLocker } from '../state/LockerContext.jsx';
import FlatGrid from './FlatGrid.jsx';

import Icon from './Icon.jsx';
import useDismiss from './useDismiss.js';

export function Avatar({ persona, size = 34 }) {
  return (
    <span className="avatar" style={{ '--avatar': persona.color, width: size, height: size, fontSize: size * 0.42 }}>
      {persona.name.replace('Mrs ', '').slice(0, 1)}
    </span>
  );
}

/** The resident persona shows the family of the flat being viewed. */
function withFlat(persona, flat) {
  if (persona.id !== 'resident') return persona;
  return { ...persona, name: `${residentOf(flat)?.name ?? 'Resident'} family`, role: `Resident · Flat ${flat}` };
}

function PersonaMenu({ current }) {
  const [open, setOpen] = useState(false);
  const [flatsOpen, setFlatsOpen] = useState(false);
  const navigate = useNavigate();
  const box = useRef(null);
  const { residentFlat, setResidentFlat } = useLocker();
  // The flats with a parcel waiting, from each flat's messages: the flats list marks them with a dot.
  const waitingFlats = useLoad(async () => {
    const waiting = await Promise.all(RESIDENTS.map((r) => waitingFor(r.flat)));
    return RESIDENTS.filter((_, i) => waiting[i].length > 0).map((r) => r.flat);
  }, []);

  function close() {
    setOpen(false);
    setFlatsOpen(false);
  }
  useDismiss(box, open, close);

  function choose(persona) {
    close();
    navigate(persona.nav[0].to);
  }
  /** Become the resident of this flat, and go to their parcels. */
  function chooseFlat(flat) {
    setResidentFlat(flat);
    close();
    navigate('/resident');
  }

  return (
    <div className="persona-menu" ref={box}>
      <button type="button" className="persona-current" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}>
        <Avatar persona={current} size={30} />
        <span className="persona-current-text">
          <span className="persona-current-name">{current.name}</span>
          <span className="persona-current-role">{current.role}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      {open && (
        <div className="persona-popover" role="menu">
          <p className="popover-label">View the parcel room as</p>
          {PERSONAS.map((base) => withFlat(base, residentFlat)).map((p) => {
            const option = (
              <button key={p.id} type="button" role="menuitem" aria-haspopup={p.id === 'resident' ? 'listbox' : undefined}
                aria-expanded={p.id === 'resident' ? flatsOpen : undefined}
                className={`persona-option${p.id === current.id ? ' is-current' : ''}${p.id === 'resident' && flatsOpen ? ' is-hovered' : ''}`}
                onClick={() => (p.id === 'resident' ? setFlatsOpen(true) : choose(p))}>
                <Avatar persona={p} size={34} />
                <span>
                  <span className="persona-option-name">{p.name}</span>
                  <span className="persona-option-role">{p.role}</span>
                </span>
                {p.id === current.id && <Icon name="check" size={16} className="persona-option-check" />}
              </button>
            );
            if (p.id !== 'resident') return option;
            // The resident opens the flats beside the menu: hover on a computer, a click on a phone.
            return (
              <div key={p.id} className="persona-option-wrap" onMouseEnter={() => setFlatsOpen(true)} onMouseLeave={() => setFlatsOpen(false)}>
                {option}
                {flatsOpen && (
                  <div className="persona-submenu">
                    <div className="persona-submenu-panel">
                      <FlatGrid value={residentFlat} onChoose={chooseFlat} waiting={(f) => Boolean(waitingFlats?.includes(f))} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { pathname } = useLocation();
  const { residentFlat } = useLocker();
  const found = personaForPath(pathname);
  const persona = found && withFlat(found, residentFlat);

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-start">
          {persona && (
            <Link to="/" className="back-home" aria-label="Back to the home page" title="Back to the home page">
              <Icon name="back" size={20} />
            </Link>
          )}
          <Link to="/" className="brand" aria-label="LockerLine home">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
            <span className="brand-text">
              <span className="brand-name">LockerLine</span>
              <span className="brand-place">{BUILDING.name} · Tower {BUILDING.tower}</span>
            </span>
          </Link>
        </div>

        <div className="header-tools">
          {persona && <PersonaMenu current={persona} />}
        </div>
      </div>
    </header>
  );
}

import { useEffect, useRef, useState } from 'react';
import { residentOf, sizeName } from '../data/building.js';
import { formatDay, formatDuration, formatTime, formatWhen } from '../data/format.js';
import { expiryOf } from '../data/messages.js';
import { useGet } from '../hooks/useLoad.js';
import { useLocker } from '../state/LockerContext.jsx';
import Icon from './Icon.jsx';
import Problem from './Problem.jsx';
import ScrollThumb from './ScrollThumb.jsx';

const HOUR = 3600 * 1000;

/** What each kind of event line says. Events carry ids and facts, never the code or a name. */
function eventText(event) {
  if (event.kind === 'dropped') return { icon: 'box', title: `Dropped into locker ${event.door}` };
  if (event.kind === 'code_issued') {
    // the code's window: from the moment it was issued to the moment it expires
    const hours = Math.round((Date.parse(event.expiresAt) - Date.parse(event.at)) / HOUR);
    return { icon: 'key', title: `Code issued for ${hours} hours`, note: `valid until ${formatWhen(Date.parse(event.expiresAt))}` };
  }
  const waited = event.dwellSeconds < 60 ? 'under a minute' : formatDuration(event.dwellSeconds);
  return { icon: 'check', title: `Collected from locker ${event.door}`, note: `waited ${waited}` };
}

/** 
The code fact: what state the code is in, and when that happened or happens.
 */
function codeFact(parcel, now) {
  const expiry = expiryOf(parcel);
  const opened = parcel.events.find((e) => e.kind === 'opened');
  if (opened) return { value: 'Used', sub: formatWhen(Date.parse(opened.at)) };
  if (expiry === null) return { value: '—', sub: 'no code issued' };
  if (now > expiry) return { value: 'Expired', sub: formatWhen(expiry) };
  return { value: 'Valid until', sub: formatWhen(expiry) };
}

/** 
The rubber stamp on the page: collected, still in the wall, or in the wall with its code run out.
 */
function stampOf(parcel, now) {
  if (parcel.state === 'collected') return { text: 'Collected', tone: 'go' };
  const expiry = expiryOf(parcel);
  if (expiry !== null && now > expiry) return { text: 'Code expired', tone: 'danger' };
  return { text: 'In the wall', tone: 'holding' };
}

/**
 * One parcel's record (GET /parcels/{parcelId}), opened like a notebook over the page you are on. The
 * address bar does not change: close it (×, Esc, or a click outside) and you are where you were.
 */
export default function ParcelNotebook({ id, onClose }) {
  const { now } = useLocker();
  const answer = useGet(`/parcels/${id}`); // null until it arrives
  const [closing, setClosing] = useState(false);
  const closeRef = useRef(null);
  const pageRef = useRef(null);
  const parcel = answer?.status === 200 ? answer.body : null;

  function close() {
    if (closing) return;
    setClosing(true);
    setTimeout(onClose, 220);
  }

  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const stamp = parcel && stampOf(parcel, now);

  return (
    <div className={`nb-scrim${closing ? ' is-closing' : ''}`} onClick={close}>
      <div className="nb-book" role="dialog" aria-modal="true" aria-labelledby="nb-title" onClick={(e) => e.stopPropagation()}>
        <div className="nb-cover" aria-hidden="true">
          <span className="nb-cover-label">
            <span className="nb-cover-small">Tower A · parcel room</span>
            <span className="nb-cover-big">Parcel notebook</span>
          </span>
        </div>

        <div ref={pageRef} className="nb-page">
          <div className="nb-rings" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => <span key={i} />)}
          </div>

          <header className="nb-head">
            <div>
              <p className="nb-eyebrow">Parcel notebook · Tower A</p>
              <h2 id="nb-title" className="nb-title mono">{parcel ? parcel.parcelId : id}</h2>
            </div>
            {stamp && <span className={`nb-stamp tone-${stamp.tone}`}>{stamp.text}</span>}
            <button ref={closeRef} type="button" className="nb-close" onClick={close} aria-label="Close the notebook">
              <Icon name="x" size={18} />
            </button>
          </header>

          {!answer ? (
            <aside className="nb-tip">
              <p className="nb-tip-title"><Icon name="book" size={15} /> How this notebook works</p>
              <p>Every change to a parcel adds a line here, written together with the change itself. A refused drop leaves no line. Lines are only ever added: nothing is rewritten or removed.</p>
              <p className="nb-tip-small">It opens over the page you are on. Close it with ×, Esc or a click outside and you are right where you were.</p>
            </aside>
          ) : !parcel ? (
            <div className="nb-blank">
              <p className="nb-hand">No page for “{id}” in this notebook.</p>
              <Problem answer={answer} about={{ parcelId: id }} compact />
              <p className="nb-help">Parcel ids look like <span className="mono">P001</span>. A refused drop never gets a page, because nothing happened to a parcel.</p>
            </div>
          ) : (
            <>
              <dl className="nb-facts">
                <div>
                  <dt>Locker</dt>
                  <dd>{parcel.door}</dd>
                  <dd className="nb-sub">{sizeName(parcel.sizeClass)}</dd>
                </div>
                <div>
                  <dt>For</dt>
                  <dd>Flat {parcel.flat}</dd>
                  <dd className="nb-sub">{residentOf(parcel.flat)?.name} family</dd>
                </div>
                <div>
                  <dt>Dropped</dt>
                  <dd>{formatDay(Date.parse(parcel.droppedAt))}</dd>
                  <dd className="nb-sub">at {formatTime(Date.parse(parcel.droppedAt))}</dd>
                </div>
                <div>
                  <dt>Code</dt>
                  <dd>{codeFact(parcel, now).value}</dd>
                  <dd className="nb-sub">{codeFact(parcel, now).sub}</dd>
                </div>
              </dl>

              <div className="nb-section">
                <h3 className="nb-hand">What happened</h3>
                <span className="nb-lock"><Icon name="lock" size={13} /> Can’t be edited</span>
              </div>
              <ol className="nb-lines">
                {parcel.events.map((event, i) => {
                  const text = eventText(event);
                  return (
                    <li key={i} className={`nb-line kind-${event.kind}`} style={{ '--i': i }}>
                      <span className="nb-icon"><Icon name={text.icon} size={14} /></span>
                      <span className="nb-text">
                        <strong>{text.title}</strong>
                        <span className="nb-note">
                          <time>{formatWhen(Date.parse(event.at))}</time>{text.note && ` · ${text.note}`}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>

              <aside className="nb-tip">
                <p className="nb-tip-title"><Icon name="book" size={15} /> How this notebook works</p>
                <p>Every change to a parcel adds a line here, written together with the change itself. A refused drop leaves no line. Lines are only ever added: nothing is rewritten or removed.</p>
                <p className="nb-tip-small">It opens over the page you are on. Close it with ×, Esc or a click outside and you are right where you were.</p>
              </aside>
            </>
          )}
        </div>
        <ScrollThumb target={pageRef} />
      </div>
    </div>
  );
}

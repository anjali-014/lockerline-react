import { api } from '../../api.js';
import Locker from '../../components/Locker.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { SIZES } from '../../data/building.js';
import { formatDuration } from '../../data/format.js';
import { expiryOf } from '../../data/messages.js';
import { useGet, useLoad } from '../../hooks/useLoad.js';
import { useLocker } from '../../state/LockerContext.jsx';

// How a size's column shares the wall's width: it keeps room for a short row of its doors, grows
// in proportion to how many doors it shows, and moves to the next line when the row is full.
const DOOR_WIDTH = { S: 92, M: 92, L: 128 };   // same widths as --door-w / --door-w-l in pages.css
const DOORS_PER_ROW_AT_LEAST = { S: 4, M: 4, L: 2 };

function sectionFlex(size, count) {
  const basis = Math.min(count, DOORS_PER_ROW_AT_LEAST[size]) * (DOOR_WIDTH[size] + 6);
  return { flex: `${count * DOOR_WIDTH[size]} 1 ${basis}px` };
}

/** Farida's wall: GET /towers/A/doors, every locker in its bank, with the counts of the whole wall above it. */
export default function Wall() {
  const { now } = useLocker();

  const answer = useGet('/towers/A/doors');
  // The stats count the whole wall: every door, and the record of each parcel in one.
  const wall = useLoad(async () => {
    const everything = await api.get('/towers/A/doors');
    const held = everything.status === 200 ? everything.body.doors.filter((d) => d.state === 'holding') : [];
    const records = await Promise.all(held.map((d) => api.get(`/parcels/${d.parcelId}`)));
    return { everything, expiries: records.map((r) => expiryOf(r.body)) };
  }, []);

  const everything = wall?.everything;
  const all = everything?.status === 200 ? everything.body.doors : [];
  const holding = all.filter((d) => d.state === 'holding');
  const longest = holding.reduce((max, d) => Math.max(max, d.dwellSeconds), 0);
  const expired = (wall?.expiries ?? []).filter((e) => e !== null && now > e).length;

  const shown = answer?.status === 200 ? answer.body.doors : [];

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Tower A parcel room</p>
          <h1 className="page-title">The wall</h1>
        </div>
        <SectionTabs personaId="caretaker" />
      </div>

      {everything?.status === 200 && (
        <div className="stats">
          <div className="stat"><span className="stat-label">Total lockers</span><strong className="stat-value">{all.length}</strong><span className="stat-note">20 small · 20 medium · 8 large</span></div>
          <div className="stat"><span className="stat-label">Free lockers</span><strong className="stat-value is-free">{all.length - holding.length}</strong><span className="stat-note">ready for a parcel</span></div>
          <div className="stat"><span className="stat-label">Holding parcels</span><strong className="stat-value">{holding.length}</strong><span className="stat-note">{holding.length ? 'waiting for residents' : 'nothing dropped yet'}</span></div>
          <div className="stat"><span className="stat-label">Longest wait</span><strong className="stat-value mono">{holding.length ? formatDuration(longest) : '—'}</strong><span className="stat-note">dwell time</span></div>
          <div className={`stat${expired ? ' is-alert' : ''}`}><span className="stat-label">Codes expired</span><strong className="stat-value">{expired}</strong><span className="stat-note">{expired ? 'parcels past their free window' : 'all codes still valid'}</span></div>
        </div>
      )}

      {answer?.status === 200 && (
        <div className="bank">
          {SIZES.map((s) => {
            const section = shown.filter((d) => d.size === s.id);
            return (
              <section
                key={s.id}
                className={`bank-col size-${s.id}`}
                aria-label={`${s.name} lockers`}
                style={sectionFlex(s.id, section.length)}
              >
                <header className="bank-col-head">
                  <span>{s.name}</span>
                  <span className="mono">{section.filter((d) => d.state === 'free').length}/{section.length} free</span>
                </header>
                <div className="bank-grid">
                  {section.map((d, i) => (
                    <Locker key={d.no} door={d} style={{ '--i': i }} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ul className="legend legend-below" aria-label="Legend">
        <li><span className="dot is-free" /> Free</li>
        <li><span className="dot is-holding" /> Holding a parcel</li>
      </ul>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { residentOf, sizeName } from '../../data/building.js';
import { formatCode, formatDuration, formatWhen } from '../../data/format.js';
import { useLoad } from '../../hooks/useLoad.js';
import { parcelsOf } from '../../state/inbox.js';
import { useLocker } from '../../state/LockerContext.jsx';
import CollectedCard from './CollectedCard.jsx';

/**
 * One parcel as its resident sees it: the code comes from the message on their phone (the wall
 * never keeps it); everything else is the parcel as GET /parcels/{parcelId} answers it now.
 */
function ParcelCard({ message, parcel, now, index }) {
  const navigate = useNavigate();
  const [shown, setShown] = useState(false);

  const expiresAt = Date.parse(message.expiresAt);       // from the SMS: the drop answer's expiresAt
  const droppedAt = Date.parse(parcel.droppedAt);

  const status = parcel.state === 'collected' ? 'used' : now > expiresAt ? 'expired' : 'valid';

  const left = Math.max(0, expiresAt - now);
  const share = Math.round((left / (expiresAt - droppedAt)) * 100);

  return (
    <article className={`parcel-card is-${status}`} style={{ '--i': index }}>
      <header className="parcel-card-head">
        <div>
          <p className="eyebrow">Waiting in locker</p>
          <p className="parcel-card-door mono">{parcel.door}</p>
        </div>
        <span className="parcel-card-size">{sizeName(parcel.sizeClass)}</span>
      </header>

      <div className="parcel-code">
        <span className="parcel-code-label">Your pickup code · from your message</span>
        <span className="parcel-code-value mono">{shown ? formatCode(message.code) : '••• •••'}</span>
        <button type="button" className="link-btn" onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Show'}</button>
      </div>

      {status === 'expired' ? (
        <p className="parcel-expired"><Icon name="alert" size={16} /> This code expired on {formatWhen(expiresAt)}. Your parcel is still in locker {parcel.door}, but this code can no longer open it.</p>
      ) : (
        <div className="validity">
          <div className="validity-bar">
            <span style={{ width: `${share}%` }} className={share < 15 ? 'is-low' : undefined} />
          </div>
          <p className="validity-text">
            Valid for <strong>{formatDuration(left / 1000)}</strong> more · until {formatWhen(expiresAt)}
          </p>
        </div>
      )}

      <footer className="parcel-card-foot">
        <span className="muted">Arrived {formatWhen(droppedAt)}</span>
        {status === 'valid' && (
          <button type="button" className="btn btn-primary" onClick={() => navigate('/resident/collect', { state: { code: message.code } })}>
            Collect <Icon name="arrow" size={16} />
          </button>
        )}
        {status === 'expired' && (
          <button type="button" className="btn btn-soft" onClick={() => navigate('/resident/collect', { state: { code: message.code } })}>
            Try the code anyway <Icon name="arrow" size={16} />
          </button>
        )}
      </footer>
    </article>
  );
}

/**  A resident's parcels: the codes their phone received, and where each parcel is now. */
export default function MyParcels() {
  const { now, residentFlat, setResidentFlat } = useLocker();
  const [params] = useSearchParams();
  const linkedFlat = params.get('flat');
  const flat = residentFlat;

  // Arriving from a link such as /resident?flat=304 switches to that flat everywhere.
  useEffect(() => {
    if (linkedFlat && linkedFlat !== residentFlat) setResidentFlat(linkedFlat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedFlat]);

  const mine = useLoad(() => parcelsOf(flat), [flat]);
  const waiting = (mine ?? []).filter((x) => x.parcel.state === 'holding');
  const collected = (mine ?? []).filter((x) => x.parcel.state === 'collected').reverse();
  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Flat {flat}</p>
          <h1 className="page-title">Hello, {residentOf(flat)?.name} family</h1>
        </div>
        <SectionTabs personaId="resident" />
      </div>

      {/* nothing until the phone and the parcels have answered */}
      {mine && (
        <>
          <h2 className="section-title">
            {waiting.length === 0 ? 'Nothing waiting for you' : `${waiting.length} parcel${waiting.length > 1 ? 's' : ''} waiting`}
          </h2>
          {waiting.length === 0 ? (
            <div className="empty">
              <Icon name="box" size={28} />
              <p className="empty-title">No parcels in the wall for flat {flat}</p>
              <p className="empty-text">When a courier drops one, you get a message with the locker and your pickup code, and it appears here.</p>
            </div>
          ) : (
            <div className="parcel-grid">
              {waiting.map((x, i) => <ParcelCard key={x.parcel.parcelId} message={x.message} parcel={x.parcel} now={now} index={i} />)}
            </div>
          )}
           {collected.length > 0 && (
            <section className="history" aria-labelledby="history-title">
              <h2 id="history-title" className="section-title">Collected <span className="section-count">{collected.length}</span></h2>
              <div className="collected-grid">
              {collected.map(({ parcel }, i) => <CollectedCard key={parcel.parcelId} parcel={parcel} index={i} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

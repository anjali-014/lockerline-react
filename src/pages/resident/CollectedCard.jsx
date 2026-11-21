import Icon from '../../components/Icon.jsx';
import ParcelBox from '../../components/ParcelBox.jsx';
import { sizeName } from '../../data/building.js';
import { formatDuration, formatWhen } from '../../data/format.js';
import { expiryOf } from '../../data/messages.js';

/** "3h 20m", or "less than a minute" for a parcel collected straight away. */
function waitedText(seconds) {
  return seconds < 60 ? 'less than a minute' : formatDuration(seconds);
}

/**
 * A parcel the resident has collected, from GET /parcels/{parcelId}: the parcel, the door it waited in,
 * when it arrived and when it was collected, how long it waited, and how long before its pickup code
 * would have expired it was picked up.
 */
export default function CollectedCard({ parcel, index }) {
  // the collection's time, the wait and the spare come from the record's lines
  const opened = parcel.events.find((e) => e.kind === 'opened');
  const arrivedAt = Date.parse(parcel.droppedAt);
  const collectedAt = opened ? Date.parse(opened.at) : null;
  const expiry = expiryOf(parcel);
  const spare = opened && expiry !== null ? (expiry - collectedAt) / 1000 : null;

  return (
    <article className="collected-card" style={{ '--i': index }}>
      <div className="collected-art" aria-hidden="true">
        <ParcelBox size={parcel.sizeClass} label={[parcel.parcelId]} scale={0.78} />
        <span className="collected-check"><Icon name="check" size={13} strokeWidth={3} /></span>
      </div>

      <div className="collected-body">
        <header className="collected-head">
          <span className="collected-door mono">{parcel.door}</span>
          <span className="collected-size">{sizeName(parcel.sizeClass)} locker</span>
          <span className="collected-id mono">{parcel.parcelId}</span>
        </header>

        <ol className="collected-timeline">
          <li><span className="collected-dot" /><span className="collected-when-label">Arrived</span><time>{formatWhen(arrivedAt)}</time></li>
          <li className="is-collected"><span className="collected-dot" /><span className="collected-when-label">Collected</span>{collectedAt !== null && <time>{formatWhen(collectedAt)}</time>}</li>
        </ol>

        {opened && <footer className="collected-foot">
          <span className="collected-waited"><Icon name="clock" size={14} /> Waited {waitedText(opened.dwellSeconds)}</span>
          {spare !== null && <span className="pill pill-ok">Picked up {formatDuration(spare)} before the code expired</span>}
        </footer>}
      </div>
    </article>
  );
}

import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Locker from '../../components/Locker.jsx';
import ParcelBox from '../../components/ParcelBox.jsx';
import CodeSent from './CodeSent.jsx';

/**
 * After the wall gives a door: the courier puts the parcel in and the door closes.
 *   'place'    the door stands open and empty; the parcel waits beside it to be dragged in;
 *   'closing'  the parcel is inside; the door swings shut;
 *   'closed'   done; OK clears the card for the next parcel.
 * 
 * Drag and drop is HTML's own (draggable, onDragOver, onDrop). Tapping the parcel does the same,
 * because phones do not drag.
 */
export default function PlaceParcel({ drop, onDone }) {
  const [stage, setStage] = useState('place');
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  function putIn() {
    if (stage !== 'place') return;
    setOver(false);
    setDragging(false);
    setStage('closing');
  }

  // The door closes by itself once the parcel is in.
  useEffect(() => {
    if (stage !== 'closing') return undefined;
    const timer = setTimeout(() => setStage('closed'), 1100);
    return () => clearTimeout(timer);
  }, [stage]);

  const door = { no: drop.door, size: drop.sizeClass, state: stage === 'place' ? 'free' : 'holding' };

  return (
    <div className={`result result-ok place is-${stage}`}>
      <ol className="place-steps" aria-label="Steps">
        <li className={stage === 'place' ? 'is-now' : 'is-done'}>
          <span>{stage === 'place' ? '1' : <Icon name="check" size={12} strokeWidth={3} />}</span> Put the parcel in the locker
        </li>
        <li className={stage === 'closed' ? 'is-done' : stage === 'closing' ? 'is-now' : ''}>
          <span>{stage === 'closed' ? <Icon name="check" size={12} strokeWidth={3} /> : '2'}</span> Locker closed
        </li>
      </ol>

      <div className="place-stage">
        <div
          className={`place-door${over ? ' is-over' : ''}${dragging ? ' is-waiting' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); putIn(); }}
        >
          <Locker door={door} open={stage === 'place'} closing={stage !== 'place'} showWait={false} />
        </div>

        {stage === 'place' && (
          <>
            <svg className="place-guide" viewBox="0 0 90 40" aria-hidden="true">
              <path d="M84 30 C 60 4, 30 4, 8 22" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
              <path d="M14 14 L6 23 L17 27" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <button
              type="button"
              className={`parcel-box size-${drop.sizeClass}${dragging ? ' is-dragging' : ''}`}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', drop.parcelId); e.dataTransfer.effectAllowed = 'move'; setDragging(true); }}
              onDragEnd={() => { setDragging(false); setOver(false); }}
              onClick={putIn}
              aria-label={`Parcel ${drop.parcelId} for flat ${drop.flat}. Put it in locker ${drop.door}`}
            >
              <ParcelBox size={drop.sizeClass} label={[drop.parcelId, `Flat ${drop.flat}`]} scale={1.2} />
            </button>
          </>
        )}
      </div>

      <div className="place-caption" aria-live="polite">
        {stage === 'place' && (
          <>
            <p className="place-title">Drag the parcel into <span className="mono">{drop.door}</span></p>
            <p className="place-text">Or tap the parcel. The locker closes by itself.</p>
          </>
        )}
        {stage === 'closing' && <p className="place-title">Closing the locker…</p>}
        {stage === 'closed' && (
          <>
            <p className="place-title"><span className="mono">{drop.door}</span> is closed and holding <span className="mono">{drop.parcelId}</span></p>
            <p className="place-text">The wall shows it holding.</p>
          </>
        )}
      </div>

      {/* the pickup code goes to the resident by SMS */}
      {stage === 'closed' && <CodeSent flat={drop.flat} expiresAt={drop.expiresAt} />}

      {stage === 'closed' && (
        <button type="button" className="btn btn-primary btn-lg btn-block place-ok" onClick={onDone} autoFocus>
          OK
        </button>
      )}
    </div>
  );
}

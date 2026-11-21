import { useEffect, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Locker from '../../components/Locker.jsx';
import ParcelBox from '../../components/ParcelBox.jsx';
import { formatDuration } from '../../data/format.js';

/** "3h 20m", or "less than a minute" for a parcel collected straight away. */
export function waitedText(seconds) {
  return seconds < 60 ? 'less than a minute' : formatDuration(seconds);
}

/**
 * After the code opens the door: the resident takes the parcel out and the door closes.
 *  'take' the door stands open with the parcel inside; drag it out to the tray (or tap it)
 * 'closing' the parcel is out the door swings shut on the empty locker.
 * 'closed' done.
 * The same HTML drag and drop the courier uses to put a parcel in.
 */
export default function TakeParcel({ opened, size, onDone }) {
  const [stage, setStage] = useState('take');
  const [dragging, setDragging] = useState(false);
  const [over, setOver] = useState(false);

  function takeOut() {
    if (stage !== 'take') return;
    setOver(false);
    setDragging(false);
    setStage('closing');
  }

  // The door closes by itself once the parcel is out.
  useEffect(() => {
    if (stage !== 'closing') return undefined;
    const timer = setTimeout(() => setStage('closed'), 1100);
    return () => clearTimeout(timer);
  }, [stage]);

  const door = { no: opened.door, size, state: 'free' };

  return (
    <div className={`take is-${stage}`} role="status" aria-live="polite">
      <div className="take-stage">
        <div className="take-door">
          <Locker door={door} open={stage === 'take'} closing={stage !== 'take'} showWait={false}>
            {stage === 'take' && (
              <button
                type="button"
                className={`take-parcel${dragging ? ' is-dragging' : ''}`}
                draggable
                onDragStart={(e) => {
                  setDragging(true);
                  e.dataTransfer.setData('text/plain', opened.parcelId);
                }}
                onDragEnd={() => setDragging(false)}
                onClick={takeOut}
                aria-label={`Take parcel ${opened.parcelId} out of locker ${opened.door}`}
              >
                <ParcelBox size={size} scale={{ S: 0.62, M: 0.66, L: 0.7 }[size] ?? 0.66} />
              </button>
            )}
          </Locker>
        </div>
        <div
          className={`take-tray${over ? ' is-over' : ''}${dragging ? ' is-waiting' : ''}${stage !== 'take' ? ' has-parcel' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={() => takeOut()}
        >
          {stage === 'take'
            ? <span className="take-tray-hint"><Icon name="box" size={18} strokeWidth={1.6} /> Drag your parcel here</span>
            : <span className="take-tray-parcel"><ParcelBox size={size} label={[opened.parcelId]} scale={0.9} /></span>
          }
        </div>
      </div>

      <div className="take-caption">
        {stage === 'take' && (
          <>
            <p className="kiosk-open-title">Locker <span className="mono">{opened.door}</span> is open</p>
            <p className="kiosk-open-text">Your parcel waited {waitedText(opened.dwellSeconds)}. Take it out of the locker: drag it to the right, or tap it.</p>
          </>
        )}
        {stage === 'closing' && (
          <p className="kiosk-open-title">Closing the locker…</p>
        )}
        {stage === 'closed' && (
          <>
            <p className="kiosk-open-title">All done</p>
            <p className="kiosk-open-text">Locker <span className="mono">{opened.door}</span> is closed and free for the next parcel.</p>
          </>
        )}
      </div>
      {stage === 'closed' && (
        <button type="button" className="btn btn-primary btn-lg btn-block take-done" onClick={onDone} autoFocus>OK</button>
      )}
    </div>
  );
}

import { formatDuration } from '../data/format.js';

/**
 *  One locker door, drawn as a real panel: a dark recess behind a brushed-aluminium door with a
 * number plate, a handle and a status light. `open` swings the door out in 3D; a holding door
 * carries an orange parcel tag and shows how long it has waited (`dwellSeconds`). `closing` swings an open door shut.
 */
export default function Locker({ door, selected = false, open = false, closing = false, showWait = true, onClick, style }) {
  const holding = door.state === 'holding';
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      style={style}
      className={`locker size-${door.size} is-${door.state}${selected ? ' is-selected' : ''}${open ? ' is-open' : ''}${closing ? ' is-closing' : ''}`}
      aria-label={onClick ? `Locker ${door.no}, ${holding ? 'holding a parcel' : 'free'}` : undefined}
    >
      {/* the inside of the locker: what is drawn here sits behind the door and is cut to the opening */}
      <span className="locker-recess" aria-hidden="true">
        {holding && <span className="locker-parcel" />}
      </span>
      <span className="locker-door" aria-hidden={!onClick}>
        <span className="locker-plate">{door.no}</span>
        <span className="locker-handle" />
        <span className="locker-light" />
        {holding && showWait && door.dwellSeconds !== undefined && (
          <span className="locker-wait">{formatDuration(door.dwellSeconds)}</span>
        )}
      </span>
    </Tag>
  );
}

import { RESIDENTS } from '../data/building.js';
import Icon from './Icon.jsx';

const FLOORS = [1, 2, 3, 4].map((floor) => ({
  floor,
  flats: RESIDENTS.filter((r) => r.flat.startsWith(String(floor))),
}));

/**
 * The building's flats, floor by floor. A dot marks a flat with a parcel waiting for it
 * (waiting(flat)); the current one is shown dark with a tick. Choosing calls onChoose(flat).
 */
export default function FlatGrid({ value, onChoose, waiting = () => false }) {
  return (
    <div className="flat-grid" role="listbox" aria-label="Flats">
      <p className="popover-label">Which resident are you?</p>
      {FLOORS.map(({ floor, flats }) => (
        <div key={floor} className="flat-floor">
          <span className="flat-floor-label">Floor {floor}</span>
          <div className="flat-floor-row">
            {flats.map((r) => (
              <button
                key={r.flat}
                type="button"
                role="option"
                aria-selected={r.flat === value}
                className={`flat-chip${r.flat === value ? ' is-current' : ''}`}
                onClick={() => onChoose(r.flat)}
              >
                <span className="flat-chip-no mono">{r.flat}</span>
                <span className="flat-chip-name">{r.name}</span>
                {waiting(r.flat) && <span className="flat-chip-dot" title="A parcel is waiting" />}
                {r.flat === value && <Icon name="check" size={12} strokeWidth={3} className="flat-chip-check" />}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="flat-popover-foot"><span className="flat-chip-dot" /> A parcel is waiting</p>
    </div>
  );
}

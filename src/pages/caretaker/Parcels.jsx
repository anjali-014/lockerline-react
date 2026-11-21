
import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import ParcelBox from '../../components/ParcelBox.jsx';
import ParcelNotebook from '../../components/ParcelNotebook.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { api } from '../../api.js';
import { residentOf, sizeName } from '../../data/building.js';
import { formatDuration } from '../../data/format.js';
import { expiryOf } from '../../data/messages.js';
import { useLoad } from '../../hooks/useLoad.js';
import { useLocker } from '../../state/LockerContext.jsx';

/**
 * A parcel's status from GET /parcels/{parcelId}.
 */
function StatusPill({ parcel, now }) {
  if (parcel.state === 'collected') {
    return <span className="pill pill-muted">Collected</span>;
  }

  const expiry = expiryOf(parcel);

  if (expiry !== null && now > expiry) {
    return <span className="pill pill-danger">Code expired</span>;
  }

  return <span className="pill pill-holding">In the wall</span>;
}

/**
 * When a collected parcel's locker was opened.
 */
const openedAt = (parcel) =>
  Date.parse(parcel.events.find((e) => e.kind === 'opened').at);

export default function Parcels() {
  const { now } = useLocker();

  const [id, setId] = useState('');
  const [openId, setOpenId] = useState(null);

  const loaded = useLoad(async () => {
    const holding = await api.get('/towers/A/doors?state=holding');

    const doors =
      holding.status === 200 ? holding.body.doors : [];

    // Each row's flat and code validity come from its parcel record.
    const records = await Promise.all(
      doors.map((door) => api.get(`/parcels/${door.parcelId}`))
    );

    const unsortedRows = doors.map((door, i) => ({
      door,
      parcel: records[i].body,
    }));

    // Locker order: D01 before D21.
    const sortedRows = unsortedRows.sort((a, b) =>
      a.door.no.localeCompare(b.door.no)
    );

    const shelf = await api.get('/parcels?state=collected');

    return {
      rows: sortedRows,

      // Most recently collected first.
      collected:
        shelf.status === 200
          ? shelf.body.parcels.sort(
              (a, b) => openedAt(b) - openedAt(a)
            )
          : [],
    };
  }, []);

  const rows = loaded?.rows ?? [];
  const collected = loaded?.collected ?? [];

  function open(e) {
    e.preventDefault();

    const text = id.trim().toUpperCase();

    if (!text) return;

    setOpenId(
      /^\d+$/.test(text)
        ? `P${text.padStart(3, '0')}`
        : text
    );
  }

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            Every drop, code and opening
          </p>
          <h1 className="page-title">Parcels</h1>
        </div>

        <SectionTabs personaId="caretaker" />
      </div>

      <div className="section-head">
        <h2 className="section-title">In the wall now</h2>

        <form className="search search-lg" onSubmit={open}>
          <Icon name="search" size={16} />

          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="Open a parcel, e.g. P001"
            aria-label="Parcel id"
          />

          <button type="submit" className="btn btn-primary">
            Open
          </button>
        </form>
      </div>

      {!loaded ? null : rows.length === 0 ? (
        <div className="empty">
          <Icon name="box" size={28} />

          <p className="empty-title">
            No parcel is waiting
          </p>

          <p className="empty-text">
            When a courier drops one, it appears here.
            A collected parcel's record opens from its id.
          </p>
        </div>
      ) : (
        <div className="table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Parcel</th>
                <th>Flat</th>
                <th>Locker</th>
                <th>Waiting</th>
                <th>Status</th>
                <th aria-label="Open" />
              </tr>
            </thead>

            <tbody>
              {rows.map(({ door, parcel }, i) => (
                <tr
                  key={door.no}
                  style={{ '--i': i }}
                  className="is-openable"
                  onClick={() => setOpenId(door.parcelId)}
                >
                  <td className="mono strong">
                    {door.parcelId}
                  </td>

                  <td>
                    {`${parcel.flat} · ${
                      residentOf(parcel.flat)?.name ?? ''
                    }`}
                  </td>

                  <td className="mono">
                    <span>{door.no}</span>
                    <span className="muted">
                      {' '}{sizeName(door.size)}
                    </span>
                  </td>

                  <td className="mono">
                    {formatDuration(door.dwellSeconds)}
                  </td>

                  <td>
                    <StatusPill parcel={parcel} now={now} />
                  </td>

                  <td>
                    <button
                      type="button"
                      className="row-link"
                      aria-label={`Open ${door.parcelId}'s notebook`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenId(door.parcelId);
                      }}
                    >
                      <Icon name="arrow" size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {collected.length > 0 && (
        <section
          className="collected-shelf-wrap"
          aria-labelledby="collected-title"
        >
          <h2
            id="collected-title"
            className="section-title"
          >
            Collected{' '}
            <span className="section-count">
              {collected.length}
            </span>
          </h2>

          <div className="collected-shelf">
            {collected.map((parcel, i) => (
              <button
                key={parcel.parcelId}
                type="button"
                className="shelf-box"
                style={{ '--i': i }}
                onClick={() => setOpenId(parcel.parcelId)}
                aria-label={`${parcel.parcelId}, collected by flat ${parcel.flat}. Open its notebook`}
              >
                <ParcelBox
                  size={parcel.sizeClass}
                  label={[parcel.parcelId]}
                  scale={1.25}
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {openId && (
        <ParcelNotebook
          key={openId}
          id={openId}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

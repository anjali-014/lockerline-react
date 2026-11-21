
import { useEffect, useRef, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import Icon from '../../components/Icon.jsx';
import { api } from '../../api.js';
import ParcelNotebook from '../../components/ParcelNotebook.jsx';
import Problem from '../../components/Problem.jsx';
import Locker from '../../components/Locker.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';

import { residentOf, sizeName, SIZES } from '../../data/building.js';
import { formatDuration, formatWhen } from '../../data/format.js';
import { expiryOf } from '../../data/messages.js';

import { useGet, useLoad } from '../../hooks/useLoad.js';
import { useLocker } from '../../state/LockerContext.jsx';


function Segmented({ label, options, value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id || 'all'}
          type="button"
          aria-pressed={value === id}
          className={`seg${value === id ? ' is-on' : ''}`}
          onClick={() => onChange(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}


/**
 * One door, read on its own from GET /towers/{tower}/doors/{no}.
 * A holding door's code validity comes from its parcel record.
 */
function DoorDrawer({ tower, no, onClose, onOpenRecord }) {
  const { now } = useLocker();

  const closeRef = useRef(null);

  const loaded = useLoad(async () => {
    const answer = await api.get(
      `/towers/${tower}/doors/${no}`
    );

    const parcel = answer.body.parcelId
      ? (
          await api.get(
            `/parcels/${answer.body.parcelId}`
          )
        ).body
      : null;

    return { answer, parcel };
  }, [tower, no]);

  const answer = loaded?.answer;
  const door = answer?.status === 200 ? answer.body : null;

  const expiry = expiryOf(loaded?.parcel);
  const expired = expiry !== null && now > expiry;

  useEffect(() => {
    const before = document.activeElement;

    closeRef.current?.focus({
      preventScroll: true,
    });

    return () => {
      before?.focus?.({
        preventScroll: true,
      });
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      className="drawer-scrim"
      onClick={onClose}
    >
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Locker ${no}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <div>
            <p className="eyebrow">
              {door
                ? `${sizeName(door.size)} locker`
                : 'Locker'}
            </p>

            <h2 className="drawer-title">{no}</h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" />
          </button>
        </header>

        {answer && !door && (
          <Problem
            answer={answer}
            about={{ tower, no }}
          />
        )}

        {door && (
          <>
            <div className="drawer-locker">
              <Locker
                door={door}
                showWait={false}
              />
            </div>

            {door.state === 'holding' ? (
              <>
                <dl className="facts">
                  <div>
                    <dt>Holding</dt>
                    <dd className="mono">
                      {door.parcelId}
                    </dd>
                  </div>

                  <div>
                    <dt>For</dt>
                    <dd>
                      Flat {door.flat} ·{' '}
                      {residentOf(door.flat)?.name}
                    </dd>
                  </div>

                  <div>
                    <dt>Waiting</dt>
                    <dd className="mono">
                      {formatDuration(door.dwellSeconds)}
                    </dd>
                  </div>

                  {expiry !== null && (
                    <div>
                      <dt>Code</dt>
                      <dd>
                        {expired ? (
                          <span className="pill pill-danger">
                            Expired {formatWhen(expiry)}
                          </span>
                        ) : (
                          <span className="pill pill-ok">
                            Valid until {formatWhen(expiry)}
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>

                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    onOpenRecord(door.parcelId);
                  }}
                >
                  Open the parcel's notebook
                  <Icon name="arrow" size={16} />
                </button>
              </>
            ) : (
              <p className="drawer-empty">
                Free. Nothing is inside, so the next{' '}
                {sizeName(door.size).toLowerCase()} parcel
                can go here.
              </p>
            )}
          </>
        )}

        <p className="drawer-foot">
          Pickup codes are never shown here: the wall keeps
          only a fingerprint of each one. The resident has
          the code.
        </p>
      </aside>
    </div>
  );
}


// How a size's column shares the wall's width.
const DOOR_WIDTH = {
  S: 92,
  M: 92,
  L: 128,
};

const DOORS_PER_ROW_AT_LEAST = {
  S: 4,
  M: 4,
  L: 2,
};


function sectionFlex(size, count) {
  const basis =
    Math.min(count, DOORS_PER_ROW_AT_LEAST[size]) *
    (DOOR_WIDTH[size] + 6);

  return {
    flex: `${count * DOOR_WIDTH[size]} 1 ${basis}px`,
  };
}


/**
 * Farida's wall: GET /towers/{tower}/doors with filters
 * as query parameters.
 */
export default function Wall() {
  const { now } = useLocker();

  const [params, setParams] = useSearchParams();

  const [selectedNo, setSelectedNo] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [findText, setFindText] = useState('');

  const tower = params.get('tower') ?? 'A';
  const size = params.get('size') ?? '';
  const state = params.get('state') ?? '';

  const query = new URLSearchParams();

  if (size) query.set('size', size);
  if (state) query.set('state', state);

  const path =
    `/towers/${tower}/doors` +
    (query.toString() ? `?${query}` : '');

  const answer = useGet(path);

  // Statistics count the whole wall, irrespective of filters.
  const wall = useLoad(async () => {
    const everything = await api.get(
      `/towers/${tower}/doors`
    );

    const held =
      everything.status === 200
        ? everything.body.doors.filter(
            (d) => d.state === 'holding'
          )
        : [];

    const records = await Promise.all(
      held.map((d) =>
        api.get(`/parcels/${d.parcelId}`)
      )
    );

    return {
      everything,
      expiries: records.map((r) =>
        expiryOf(r.body)
      ),
    };
  }, [tower]);

  const everything = wall?.everything;

  const all =
    everything?.status === 200
      ? everything.body.doors
      : [];

  const holding = all.filter(
    (d) => d.state === 'holding'
  );

  const longest = holding.reduce(
    (max, d) => Math.max(max, d.dwellSeconds),
    0
  );

  const expired = (wall?.expiries ?? []).filter(
    (e) => e !== null && now > e
  ).length;


  function setFilter(name, value) {
    const next = new URLSearchParams(params);

    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }

    setParams(next);
  }


  function findDoor(e) {
    e.preventDefault();

    const text = findText.trim().toUpperCase();

    if (!text) return;

    setSelectedNo(
      /^\d+$/.test(text)
        ? `D${text.padStart(2, '0')}`
        : text
    );

    setFindText('');
  }


  const shown =
    answer?.status === 200
      ? answer.body.doors
      : [];


  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">
            Tower {tower} parcel room
          </p>

          <h1 className="page-title">
            The wall
          </h1>
        </div>

        <SectionTabs personaId="caretaker" />
      </div>


      {everything?.status === 200 && (
        <div className="stats">
          <div className="stat">
            <span className="stat-label">
              Total lockers
            </span>

            <strong className="stat-value">
              {all.length}
            </strong>

            <span className="stat-note">
              20 small · 20 medium · 8 large
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Free lockers
            </span>

            <strong className="stat-value is-free">
              {all.length - holding.length}
            </strong>

            <span className="stat-note">
              ready for a parcel
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Holding parcels
            </span>

            <strong className="stat-value">
              {holding.length}
            </strong>

            <span className="stat-note">
              {holding.length
                ? 'waiting for residents'
                : 'nothing dropped yet'}
            </span>
          </div>

          <div className="stat">
            <span className="stat-label">
              Longest wait
            </span>

            <strong className="stat-value mono">
              {holding.length
                ? formatDuration(longest)
                : '—'}
            </strong>

            <span className="stat-note">
              dwell time
            </span>
          </div>

          <div className={`stat${expired ? ' is-alert' : ''}`}>
            <span className="stat-label">
              Codes expired
            </span>

            <strong className="stat-value">
              {expired}
            </strong>

            <span className="stat-note">
              {expired
                ? 'parcels past their free window'
                : 'all codes still valid'}
            </span>
          </div>
        </div>
      )}


      <div className="toolbar">
        <Segmented
          label="Size"
          value={size}
          onChange={(v) => setFilter('size', v)}
          options={[
            ['', 'All sizes'],
            ...SIZES.map((s) => [s.id, s.name]),
          ]}
        />

        <Segmented
          label="State"
          value={state}
          onChange={(v) => setFilter('state', v)}
          options={[
            ['', 'Any state'],
            ['free', 'Free'],
            ['holding', 'Holding'],
          ]}
        />

        {(size || state) && answer?.status === 200 && (
          <p
            className="filter-count"
            aria-live="polite"
          >
            <strong>{shown.length}</strong> shown ·{' '}
            <strong className="is-free">
              {answer.body.free}
            </strong>{' '}
            free
          </p>
        )}

        <form
          className="search find-door"
          onSubmit={findDoor}
        >
          <Icon name="search" size={16} />

          <input
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            placeholder="Find a locker, e.g. D07"
            aria-label="Find a locker"
          />
        </form>
      </div>


      {!answer ? null : answer.status !== 200 ? (
        <Problem
          answer={answer}
          about={{ tower }}
        >
          <Link
            to="/caretaker/wall"
            className="btn btn-soft problem-action"
          >
            Show the whole wall
          </Link>
        </Problem>
      ) : shown.length === 0 ? (
        <div className="empty">
          <Icon name="box" size={28} />

          <p className="empty-title">
            No locker matches these filters
          </p>

          <p className="empty-text">
            {state === 'holding'
              ? size
                ? 'Nothing of this size is holding a parcel right now.'
                : 'Nothing is holding a parcel right now.'
              : size
                ? 'Every locker of this size is in use.'
                : 'Every locker is in use.'}
          </p>
        </div>
      ) : (
        <div className="bank">
          {SIZES.map((s) => {
            const section = shown.filter(
              (d) => d.size === s.id
            );

            if (section.length === 0) return null;

            return (
              <section
                key={s.id}
                className={`bank-col size-${s.id}`}
                aria-label={`${s.name} lockers`}
                style={sectionFlex(s.id, section.length)}
              >
                <header className="bank-col-head">
                  <span>{s.name}</span>

                  <span className="mono">
                    {
                      section.filter(
                        (d) => d.state === 'free'
                      ).length
                    }
                    /{section.length} free
                  </span>
                </header>

                <div className="bank-grid">
                  {section.map((d, i) => (
                    <Locker
                      key={d.no}
                      door={d}
                      selected={d.no === selectedNo}
                      onClick={() => setSelectedNo(d.no)}
                      style={{ '--i': i }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}


      <ul
        className="legend legend-below"
        aria-label="Legend"
      >
        <li>
          <span className="dot is-free" /> Free
        </li>

        <li>
          <span className="dot is-holding" /> Holding a parcel
        </li>
      </ul>


      {/* Drawer and notebook are separate overlays.
          Closing the drawer first allows the notebook
          to open directly over the wall. */}

      {selectedNo && (
        <DoorDrawer
          tower={tower}
          no={selectedNo}
          onClose={() => setSelectedNo(null)}
          onOpenRecord={(parcelId) => {
            setSelectedNo(null);
            setRecordId(parcelId);
          }}
        />
      )}

      {recordId && (
        <ParcelNotebook
          key={recordId}
          id={recordId}
          onClose={() => setRecordId(null)}
        />
      )}
    </div>
  );
}

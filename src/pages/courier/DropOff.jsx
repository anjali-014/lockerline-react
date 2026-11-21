import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import ParcelBox from '../../components/ParcelBox.jsx';
import Problem from '../../components/Problem.jsx';
import { api } from '../../api.js';
import { residentOf, sizeName, SIZES } from '../../data/building.js';
import { formErrors } from '../../data/messages.js';
import { useGet } from '../../hooks/useLoad.js';
import { useLocker } from '../../state/LockerContext.jsx';

/**  A parcel box drawn to scale, so the three sizes are told apart at a glance. */
function BoxArt({ size }) {
  return (
    <span className="box-art" aria-hidden="true">
      <ParcelBox size={size} scale={0.58} />
    </span>
  );
}

function Result({ answer, flat, onUseSize }) {
  if (!answer) {
    return (
      <div className="result result-idle">
        <div className="result-idle-art"><Icon name="box" size={34} strokeWidth={1.4} /></div>
        <p className="result-idle-title">Your locker appears here</p>
        <p className="result-idle-text">Pick the parcel's size, type the flat number, and the wall chooses a locker for you.</p>
      </div>
    );
  }

  const isNoDoor = answer.body.type === '/errors/no-door-free';
  return (
    <div className="result result-no">
      <Problem answer={answer} about={{ flat }}>
        {isNoDoor && answer.body.freeSizes.length > 0 && (
          <>
            <div className="result-sizes">
              {answer.body.freeSizes.map((s) => (
                <button key={s} type="button" className="btn btn-soft" onClick={() => onUseSize(s)}>
                  Use a {sizeName(s).toLowerCase()} locker
                </button>
              ))}
            </div>
            <p className="result-hint">If it fits nowhere else, wait for a locker to free up or take the parcel back to the depot.</p>
          </>
        )}
        {answer.body.type === '/errors/validation' && <p className="result-hint">Nothing was booked and no locker was taken.</p>}
        )}
      </Problem>
    </div>
  );
}

export default function DropOff() {
  const { changed } = useLocker();
  const [size, setSize] = useState('');
  const [flat, setFlat] = useState('');
  const [answer, setAnswer] = useState(null);

  const freeDoors = useGet('/towers/A/doors?state=free');
  const free = Object.fromEntries(SIZES.map((s) => [s.id, freeDoors?.status === 200 ? freeDoors.body.doors.filter((d) => d.size === s.id).length : null]));
  const resident = /^\d{3}$/.test(flat) ? residentOf(flat) : null;

  // the words under each field the answer names
  const fieldErrors = formErrors(answer, flat);

  async function submit(e) {
    e.preventDefault();
    const result = await api.post('/drops', size ? { sizeClass: size, flat } : { flat });   // no size picked: the field is left out
    if (result.status === 201) changed();
    else setAnswer(result);
  }

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Drop-off · Tower A</p>
          <h1 className="page-title">Get a locker</h1>
        </div>
      </div>

      <div className="split">
        <form className="card form" onSubmit={submit} noValidate>
          <fieldset className="field">
            <legend className="field-label"><span className="step-no">1</span> Parcel size</legend>
            <div className="size-options">
              {SIZES.map((s) => (
                <label key={s.id} className={`size-option${size === s.id ? ' is-on' : ''}${free[s.id] === 0 ? ' is-full' : ''}`}>
                  <input type="radio" name="size" value={s.id} checked={size === s.id}
                    onChange={() => { setSize(s.id); setAnswer(null); }} className="sr-only" />
                  <BoxArt size={s.id} />
                  <span className="size-name">{s.name}</span>
                  <span className="size-fits">{s.fits}</span>
                  <span className={`size-free mono${free[s.id] === 0 ? ' is-zero' : ''}`}>
                    {free[s.id] === null ? '' : free[s.id] === 0 ? 'Full' : `${free[s.id]} free`}
                  </span>
                </label>
              ))}
            </div>
            {fieldErrors.sizeClass && <p className="field-error">{fieldErrors.sizeClass}</p>}
          </fieldset>

          <div className="field">
            <label className="field-label" htmlFor="flat"><span className="step-no">2</span> Flat number</label>
            <div className={`input-wrap${fieldErrors.flat ? ' has-error' : ''}`}>
              <input
                id="flat"
                className="input mono"
                value={flat}
                maxLength={4}
                placeholder="302"
                onChange={(e) => { setFlat(e.target.value.trim()); setAnswer(null); }}
                autoComplete="off"
                aria-invalid={Boolean(fieldErrors.flat)}
                aria-describedby="flat-help"
              />
              {resident && <span className="input-match"><Icon name="check" size={14} strokeWidth={2.4} /> {resident.name}</span>}
            </div>
            <p id="flat-help" className={fieldErrors.flat ? 'field-error' : 'field-help'}>
              {fieldErrors.flat ?? 'Written on the parcel label. Flats 101 to 404.'}
            </p>
          </div>

          <button type="submit" className="btn btn-primary btn-lg btn-block">
            Get a locker <Icon name="arrow" size={18} />
          </button>
        </form>

        <div className="result-slot">
          <Result answer={answer} flat={flat} onUseSize={(s) => { setSize(s); setAnswer(null); }} />
        </div>
      </div>
    </div>
  );
}

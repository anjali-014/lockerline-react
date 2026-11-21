import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import SectionTabs from '../../components/SectionTabs.jsx';
import { api } from '../../api.js';
import { explain } from '../../data/messages.js';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

/** What the keypad says when fewer than six digits are keyed: nothing is sent. */
const SIX_DIGITS = { title: 'Enter all six digits', text: 'The code from your message has six digits.' };

/** The lobby keypad: POST /pickups with the six-digit code. */
export default function Collect() {
  const location = useLocation();
  const [code, setCode] = useState(location.state?.code ?? '');
  const [problem, setProblem] = useState(null);
  const [shake, setShake] = useState(0);

  function press(key) {
    setProblem(null);
    if (key === 'clear') setCode('');
    else if (key === 'back') setCode(code.slice(0, -1));
    else if (code.length < 6) setCode(code + key);
  }

  function refuse(message) {
    setProblem(message);
    setShake(shake + 1);
  }

  async function open() {
    if (code.length < 6) {
      refuse(SIX_DIGITS);
      return;
    }
    const result = await api.post('/pickups', { code });
    if (result.status !== 200) refuse(explain(result));
  }

  // The physical keyboard works too: digits, Backspace, Escape and Enter.
  useEffect(() => {
    function onKey(e) {
      if (e.defaultPrevented) return;   // an open menu has already used this key (Escape closes it)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('back');
      else if (e.key === 'Escape') press('clear');
      else if (e.key === 'Enter') {
        // a focused link or button outside the keypad takes its own Enter; a focused screen key is not pressed again
        if (e.target.closest('a, button') && !e.target.closest('.keypad')) return;
        e.preventDefault();
        open();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="page is-fit">
      <div className="page-head">
        <div>
          <p className="eyebrow">Lobby keypad</p>
          <h1 className="page-title">Collect a parcel</h1>
          <p className="kiosk-lede">Key the six-digit code from your message. The locker holding your parcel opens, once.</p>
        </div>
        <SectionTabs personaId="resident" />
      </div>

      <div className="kiosk">
        <div className="kiosk-screen">
          <div key={shake} className={`code-slots${problem ? ' is-wrong' : ''}`} role="group" aria-label={`Code: ${code.length} of 6 digits`}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={`slot${i < code.length ? ' is-filled' : ''}${i === code.length ? ' is-next' : ''}`}>{code[i] ?? ''}</span>
            ))}
          </div>
          <p className={`kiosk-message${problem ? ' is-wrong' : ''}`} role={problem ? 'alert' : undefined}>{problem ? <><strong>{problem.title}.</strong> {problem.text}</> : 'Enter your code'}</p>
        </div>
        <div className="keypad">
          {KEYS.map((key) => (
            <button key={key} type="button" className={`key${key.length > 1 ? ' key-fn' : ''}`} onClick={() => press(key)}
              aria-label={key === 'back' ? 'Delete' : key === 'clear' ? 'Clear' : key}>
              {key === 'back' ? '⌫' : key === 'clear' ? 'C' : key}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-lg btn-block" onClick={open}>
          <Icon name="key" size={18} /> Open my locker
        </button>
      </div>
    </div>
  );
}

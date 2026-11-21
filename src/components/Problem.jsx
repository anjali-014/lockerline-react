import { explain } from '../data/messages.js';
import Icon from './Icon.jsx';

/**
 * A refusal, shown the same way on every screen: what happened, and what to do next. `about` is what
 * the screen asked about (a tower, a locker, a flat, a parcel id), so the words can name it.
 */
export default function Problem({ answer, about, children, compact = false }) {
  const { title, text } = explain(answer, about);
  return (
    <div className={`problem${compact ? ' is-compact' : ''}`} role="alert">
      <span className="problem-icon"><Icon name="alert" size={compact ? 16 : 20} /></span>
      <div className="problem-body">
        <p className="problem-title">{title}</p>
        {text && <p className="problem-text">{text}</p>}
        {children}
      </div>
    </div>
  );
}

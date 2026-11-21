import { explain } from '../data/messages.js';
import Icon from './Icon.jsx';

/**
 * A refusal, shown the same way on every screen: what happened, and what to do next. `about` is what
 * the screen asked about, so the words can name it.
 */
export default function Problem({ answer, about, children }) {
  const { title, text } = explain(answer, about);
  return (
    <div className="problem" role="alert">
      <span className="problem-icon"><Icon name="alert" size={20} /></span>
      <div className="problem-body">
        <p className="problem-title">{title}</p>
        {text && <p className="problem-text">{text}</p>}
        {children}
      </div>
    </div>
  );
}

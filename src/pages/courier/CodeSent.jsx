import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { residentOf } from '../../data/building.js';
import { formatWhen } from '../../data/format.js';

/**
 * The courier never sees a pickup code: it goes to the resident by SMS once the parcel is in.
 * The note first shows the message being sent (typing dots), then that it was delivered, with a
 * link to the resident's own screen.
 */
export default function CodeSent({ flat, expiresAt }) {
  const [delivered, setDelivered] = useState(false);
  const family = residentOf(flat)?.name;

  useEffect(() => {
    const timer = setTimeout(() => setDelivered(true), 1400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`code-sent${delivered ? ' is-delivered' : ''}`} role="status" aria-live="polite">
      <span className="code-sent-icon">
        <Icon name="message" size={18} strokeWidth={2} />
        {delivered && <span className="code-sent-dot" aria-hidden="true" />}
      </span>
      {delivered ? (
        <div className="code-sent-body" key="delivered">
          <p className="code-sent-title">Pickup code sent to Flat {flat}</p>
          <p className="code-sent-text">
            <span className="code-sent-tick"><Icon name="check" size={11} strokeWidth={3} /></span>
            SMS delivered to the {family} family
          </p>
          {expiresAt && <p className="code-sent-text">The code is valid until {formatWhen(Date.parse(expiresAt))}, counted from the drop.</p>}
        </div>
      ) : (
        <div className="code-sent-body" key="sending">
          <p className="code-sent-title">Sending the pickup code to Flat {flat}</p>
          <p className="code-sent-typing" aria-label="sending"><i /><i /><i /></p>
        </div>
      )}
      {delivered && (
        <Link to={`/resident?flat=${flat}`} className="link-btn code-sent-link">
          See as resident <Icon name="arrow" size={14} />
        </Link>
      )}
    </div>
  );
}

// Every refusal the backend can give the screens, in the words of the person who meets it. The backend
// gives one shape (type, title, status, detail, and for a form the fields it could not take); this turns
// the type and its facts into a sentence and a next step. The backend's own wording never reaches the screen.

const SIZE_WORDS = { S: 'small', M: 'medium', L: 'large' };

/** What to do about each field the backend could not take, whatever was wrong with it. */
const FIELD_WORDS = {
  size: 'Pick a size: small, medium or large.',
  sizeClass: 'Pick a size: small, medium or large.',
  state: 'Pick a state: free or holding.',
  flat: 'Type the flat number first.',
  code: 'Key the six-digit code from your message.',
};

/** The words under each field of the drop-off form, for the fields the backend could not take. */
const FORM_WORDS = {
  sizeClass: 'Choose small, medium or large.',
  flat: 'A flat number is three digits, like 302.',
};

/** One sentence per field the backend named, each said once. */
function fieldsText(errors = []) {
  const said = errors.map((e) => FIELD_WORDS[e.field] ?? 'Check what you entered and try again.');
  return [...new Set(said)].join(' ');
}

/**
 * A path nothing serves (an id typed with a slash, an empty tower) is said as the thing that is not
 * there: `about` holds what the screen asked for (tower, locker no).
 */
function missing(about) {
  if (about.no !== undefined && about.tower && !about.tower.includes('/')) return '/errors/no-such-door';
  if (about.tower !== undefined) return '/errors/no-such-tower';
  return null;
}

/**
 * The title and text a person sees for a refusal. `about` holds what the screen asked about (the
 *  tower, the locker number, the flat), so the words name it the way the screen does.
 */
export function explain(answer, about = {}) {
  const body = answer.body ?? {};
  const type = body.type === 'about:blank' && answer.status === 404 ? missing(about) : body.type;

  switch (type) {
    case '/errors/no-such-tower': {
      const tower = about.tower ? `There is no tower ${about.tower}` : 'There is no such tower';
      return { title: 'That tower is not here', text: `${tower}. This parcel room serves Tower A only.` };
    }
    case '/errors/no-such-door':
      return { title: 'No such locker', text: `Tower ${about.tower} has no locker ${about.no}. Lockers run from D01 to D48.` };
    case '/errors/validation':
      return { title: 'That is not a valid choice', text: fieldsText(body.errors) };
    case '/errors/no-such-flat': {
      const flat = about.flat ? `There is no flat ${about.flat} in this tower` : 'That flat is not in this tower';
      return { title: 'Unknown flat', text: `${flat}. Nothing was booked and no locker was taken.` };
    }
    case '/errors/no-door-free': {
      const sizes = (body.freeSizes ?? []).map((s) => SIZE_WORDS[s]);
      return {
        title: 'No free locker of that size',
        text: sizes.length ? `Free right now: ${sizes.join(' and ')}.` : 'Every locker in the wall is holding a parcel.',
      };
    }
    case '/errors/no-such-code': return { title: "That code doesn't match a parcel", text: 'Check the digits and try again.' };
    case '/errors/code-expired': return { title: 'This code has expired', text: 'Its free window has ended, so it can no longer open the locker.' };
    case '/errors/code-used': return { title: 'This code was already used', text: 'A code opens its locker once. The parcel has been collected.' };
    default:
      return { title: 'That did not work', text: 'Please try again.' };
  }
}

/**
 * The drop-off form's words under its fields for this answer: { sizeClass?, flat? }. A refused form
 * names each field that failed; an unknown flat is about the flat box.
 */
export function formErrors(answer, flat) {
  const errors = {};
  if (answer?.body?.type === '/errors/validation') {
    for (const e of answer.body.errors ?? []) if (FORM_WORDS[e.field]) errors[e.field] = FORM_WORDS[e.field];
  }
  if (answer?.body?.type === '/errors/no-such-flat') errors.flat = `Flat ${flat} is not in Tower A.`;
  return errors;
}

/**
 * When a parcel's pickup code expires: the code_issued line of its record (GET /parcels/{parcelId} carries
 * no expiry field of its own). Null when the record does not say.
 */
export function expiryOf(parcel) {
  const issued = parcel?.events?.find((e) => e.kind === 'code_issued');
  return issued ? Date.parse(issued.expiresAt) : null;
}

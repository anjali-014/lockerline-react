// Every refusal the backend can give the screens, in the words of the person who meets it. The backend
// gives one shape (type, title, status, detail, and for a form the fields it could not take); this turns
// the type and its facts into a sentence and a next step. The backend's own wording never reaches the screen.

/** What to do about each field the backend could not take, whatever was wrong with it. */
const FIELD_WORDS = {
  size: 'Pick a size: small, medium or large.',
  state: 'Pick a state: free or holding.',
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
 * tower, the locker number), so the words name it the way the screen does.
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
    default:
      return { title: 'That did not work', text: 'Please try again.' };
  }
}

/**
 * When a parcel's pickup code expires: the code_issued line of its record (GET /parcels/{parcelId} carries
 * no expiry field of its own). Null when the record does not say.
 */
export function expiryOf(parcel) {
  const issued = parcel?.events?.find((e) => e.kind === 'code_issued');
  return issued ? Date.parse(issued.expiresAt) : null;
}

import { api } from '../api.js';

/**
 * A flat's parcels as its resident knows them: each message on the flat's phone, with the parcel it
 * names as GET /parcels/{parcelId} answers it now. Oldest message first.
 */
export async function parcelsOf(flat) {
  const inbox = await api.get(`/phones/${flat}/messages`);
  const messages = inbox.status === 200 ? inbox.body.messages : [];
  const answers = await Promise.all(messages.map((m) => api.get(`/parcels/${m.parcelId}`)));
  return messages
  .map((message, i) => ({ message, parcel: answers[i].body }))
  .filter((x) => x.parcel?.parcelId);
}

/**
* The flat's parcels still in a locker. Expired codes are included: the resident can still try one at
 * the keypad and be refused.
 */
export async function waitingFor(flat) {
  return (await parcelsOf(flat)).filter((x) => x.parcel.state === 'holding');
}
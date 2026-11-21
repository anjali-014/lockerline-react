/**
 * When a parcel's pickup code expires: the code_issued line of its record (GET /parcels/{parcelId} carries
 * no expiry field of its own). Null when the record does not say.
 */
export function expiryOf(parcel) {
  const issued = parcel?.events?.find((e) => e.kind === 'code_issued');
  return issued ? Date.parse(issued.expiresAt) : null;
}

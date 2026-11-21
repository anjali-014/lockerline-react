// The building as the screens name it: tower A, its three locker sizes and its 16 flats.

export const BUILDING = { name: 'Sunrise Heights', tower: 'A' };

export const SIZES = [
  { id: 'S', name: 'Small', fits: 'Envelopes, books, phone boxes' },
  { id: 'M', name: 'Medium', fits: 'Shoe boxes, groceries, kits' },
  { id: 'L', name: 'Large', fits: 'Monitors, cartons, luggage' },
];

export function sizeName(id) {
  return SIZES.find((s) => s.id === id)?.name ?? id;
}

/** The flats and their families, floor by floor. */
export const RESIDENTS = [
  { flat: '101', name: 'Iyer' }, { flat: '102', name: 'Banerjee' }, { flat: '103', name: 'Fernandes' },
  { flat: '104', name: 'Kapoor' }, { flat: '201', name: 'Reddy' }, { flat: '202', name: 'Malhotra' },
  { flat: '203', name: 'Shetty' }, { flat: '204', name: 'Bose' }, { flat: '301', name: 'Nair' },
  { flat: '302', name: 'Rao' }, { flat: '303', name: 'Ahuja' }, { flat: '304', name: 'Chawla' },
  { flat: '401', name: 'Dutta' }, { flat: '402', name: 'Gill' }, { flat: '403', name: 'Hegde' },
  { flat: '404', name: 'Jain' },
];

export function residentOf(flat) {
  return RESIDENTS.find((r) => r.flat === flat) ?? null;
}

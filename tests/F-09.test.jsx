import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { HOUR, MINUTE, TUE_1430, clockAt, drop, jump, person, wait } from './given.js';
import { reading } from './look.js';

afterEach(() => vi.useRealTimers());

/**
 * A parcel for flat 302 in D22 (D21 holds another flat's parcel), waited `waited` ms; the keypad opens with its code
 * keyed and "Open my locker" pressed. Gives back the parcel and the app.
 */
async function openLocker({ waited = 3 * HOUR + 20 * MINUTE, alsoWaiting = false } = {}) {
  clockAt(TUE_1430);
  let mine;
  const app = await openApp('/resident/collect', {
    before: async (api) => {
      await drop(api, 'M', '304');
      mine = await drop(api, 'M', '302');
      if (alsoWaiting) await drop(api, 'S', '302');
      jump(waited);
    },
  });
  const user = person();
  for (const digit of mine.code) await user.click(screen.getByRole('button', { name: digit }));
  await user.click(screen.getByRole('button', { name: 'Open my locker' }));
  await screen.findByRole('button', { name: `Take parcel ${mine.parcelId} out of locker D22` });
  return { ...app, user, mine, take: () => screen.getByRole('button', { name: `Take parcel ${mine.parcelId} out of locker D22` }) };
}

describe('F-09 · The door opens', () => {
  test('the right code opens D22 with the parcel inside, and the caption tells how long it waited', async () => {
    const { take } = await openLocker();
    expect(screen.queryByRole('button', { name: 'Open my locker' })).not.toBeInTheDocument();
    expect(take()).toBeInTheDocument();
    expect(screen.getByText(reading('Locker D22 is open'))).toBeInTheDocument();
    expect(screen.getByText('Your parcel waited 3h 20m. Take it out of the locker: drag it to the right, or tap it.')).toBeInTheDocument();
    expect(screen.getByText(reading('Drag your parcel here'))).toBeInTheDocument();
  });

  test('a parcel that went in less than a minute ago "waited less than a minute"', async () => {
    await openLocker({ waited: 20 * 1000 });
    expect(screen.getByText('Your parcel waited less than a minute. Take it out of the locker: drag it to the right, or tap it.')).toBeInTheDocument();
  });

  test('taking the parcel out (the tap that stands in for a drag) puts it in the tray with its id and says "Closing the locker…"', async () => {
    const { user, mine, take } = await openLocker();
    await user.click(take());
    expect(screen.getByText('Closing the locker…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Take parcel/ })).not.toBeInTheDocument();
    expect(screen.queryByText(reading('Drag your parcel here'))).not.toBeInTheDocument();
    expect(screen.getByText(mine.parcelId)).toBeInTheDocument();
  });

  test('tapping the parcel with a finger takes it out the same way', async () => {
    const { user, mine, take } = await openLocker();
    await user.pointer({ keys: '[TouchA]', target: take() });
    expect(screen.getByText('Closing the locker…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Take parcel/ })).not.toBeInTheDocument();
    expect(screen.getByText(mine.parcelId)).toBeInTheDocument();
  });

  test('about a second later the caption says "All done" and "Locker D22 is closed and free for the next parcel.", with OK', async () => {
    const { user, take } = await openLocker();
    await user.click(take());
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    await wait(1200);
    expect(await screen.findByText('All done')).toBeInTheDocument();
    expect(screen.getByText(reading('Locker D22 is closed and free for the next parcel.'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    expect(screen.queryByText('Closing the locker…')).not.toBeInTheDocument();
  });

  test('OK goes to My parcels, where the parcel now shows under Collected', async () => {
    const { user, mine, take, address } = await openLocker({ alsoWaiting: true });
    await user.click(take());
    await wait(1200);
    await user.click(await screen.findByRole('button', { name: 'OK' }));
    expect(address()).toBe('/resident');
    const shelf = await screen.findByRole('region', { name: /^Collected/ });
    expect(within(shelf).getByText('D22')).toBeInTheDocument();
    expect(within(shelf).getAllByText(mine.parcelId).length).toBeGreaterThan(0);
  });

  test('with nothing else waiting for the flat, after OK the title row has no tabs', async () => {
    const { user, take } = await openLocker();
    await user.click(take());
    await wait(1200);
    await user.click(await screen.findByRole('button', { name: 'OK' }));
    await screen.findByRole('region', { name: /^Collected/ });
    expect(screen.queryByRole('link', { name: /^Collect/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^My parcels/ })).not.toBeInTheDocument();
  });

  test('once the locker has opened, Farida\'s wall shows D22 free', async () => {
    const { user, address } = await openLocker();
    await user.click(screen.getByRole('link', { name: 'LockerLine home' }));
    await user.click(screen.getByRole('link', { name: /Continue as Farida/ }));
    expect(address()).toBe('/caretaker/wall');
    expect(await screen.findByRole('button', { name: /D22.*free/ })).toBeInTheDocument();
  });
});

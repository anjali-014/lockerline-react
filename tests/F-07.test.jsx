import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { HOUR, MINUTE, TUE_1430, clockAt, drop, jump, person, pickUp, wait } from './given.js';
import { pageWords, reading, wordsOf } from './look.js';

afterEach(() => vi.useRealTimers());

/** Thursday 5 November 2026, 11:10 in the building: a parcel dropped then and collected 3h 20m later goes at 14:30. */
const THU_1110 = new Date('2026-11-05T11:10:00+05:30');

const waitingCards = () => screen.getAllByRole('article').filter((card) => within(card).queryByText('Waiting in locker'));
const spaced = (code) => code.slice(0, 3) + ' ' + code.slice(3);

describe('F-07 · My parcels', () => {
  test('with nothing dropped for flat 302 the page says "Nothing waiting for you" with the empty message', async () => {
    await openApp('/resident');
    expect(await screen.findByRole('heading', { name: 'Nothing waiting for you' })).toBeInTheDocument();
    expect(screen.getByText('No parcels in the wall for flat 302')).toBeInTheDocument();
    expect(screen.getByText('When a courier drops one, you get a message with the locker and your pickup code, and it appears here.')).toBeInTheDocument();
  });

  test('one medium parcel in D22 gives "1 parcel waiting" and one card with "Waiting in locker", "D22" and "Medium"', async () => {
    await openApp('/resident', {
      before: async (api) => {
        await drop(api, 'M', '304');
        await drop(api, 'M', '302');
      },
    });
    expect(await screen.findByRole('heading', { name: '1 parcel waiting' })).toBeInTheDocument();
    const cards = waitingCards();
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByText('Waiting in locker')).toBeInTheDocument();
    expect(within(cards[0]).getByText('D22')).toBeInTheDocument();
    expect(within(cards[0]).getByText('Medium')).toBeInTheDocument();
  });

  test('two parcels give "2 parcels waiting" and two cards, the oldest first', async () => {
    let older;
    let newer;
    await openApp('/resident', {
      before: async (api) => {
        older = await drop(api, 'M', '302');
        newer = await drop(api, 'S', '302');
      },
    });
    expect(await screen.findByRole('heading', { name: '2 parcels waiting' })).toBeInTheDocument();
    const cards = waitingCards();
    expect(cards).toHaveLength(2);
    expect(within(cards[0]).getByText(older.door)).toBeInTheDocument();
    expect(within(cards[1]).getByText(newer.door)).toBeInTheDocument();
  });

  test('a card\'s code reads "Your pickup code · from your message" and "••• •••", with the digits hidden', async () => {
    let code;
    await openApp('/resident', { before: async (api) => { ({ code } = await drop(api, 'M', '302')); } });
    const [card] = await screen.findAllByRole('article');
    expect(within(card).getByText('Your pickup code · from your message')).toBeInTheDocument();
    expect(within(card).getByText('••• •••')).toBeInTheDocument();
    expect(pageWords()).not.toContain(code);
    expect(pageWords()).not.toContain(spaced(code));
  });

  test('Show reveals the six digits in two groups of three and becomes Hide; Hide hides them again', async () => {
    let code;
    await openApp('/resident', { before: async (api) => { ({ code } = await drop(api, 'M', '302')); } });
    const user = person();
    const [card] = await screen.findAllByRole('article');
    await user.click(within(card).getByRole('button', { name: 'Show' }));
    expect(within(card).getByText(spaced(code))).toBeInTheDocument();
    expect(within(card).queryByText('••• •••')).not.toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Hide' }));
    expect(within(card).getByText('••• •••')).toBeInTheDocument();
    expect(within(card).queryByText(spaced(code))).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Show' })).toBeInTheDocument();
  });

  test('a parcel dropped 4 hours ago reads "Valid for 1d 20h more · until Thu 5 Nov, 14:30"', async () => {
    clockAt(TUE_1430);
    await openApp('/resident', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(4 * HOUR);
      },
    });
    expect(await screen.findByText(reading('Valid for 1d 20h more · until Thu 5 Nov, 14:30'))).toBeInTheDocument();
  });

  test('a card\'s foot says "Arrived" with the day and time of the drop, and has a Collect button', async () => {
    clockAt(TUE_1430);
    await openApp('/resident', { before: (api) => drop(api, 'M', '302') });
    const [card] = await screen.findAllByRole('article');
    expect(within(card).getByText(reading('Arrived Tue 3 Nov, 14:30'))).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Collect' })).toBeInTheDocument();
  });

  test('Collect opens the Collect page', async () => {
    const { address } = await openApp('/resident', { before: async (api) => { await drop(api, 'M', '302'); } });
    const [card] = await screen.findAllByRole('article');
    await person().click(within(card).getByRole('button', { name: 'Collect' }));
    expect(address()).toBe('/resident/collect');
  });

  test('after the free window has ended the card says the code expired and the button reads "Try the code anyway"', async () => {
    clockAt(TUE_1430);
    await openApp('/resident', {
      before: async (api) => {
        await drop(api, 'M', '304');
        await drop(api, 'M', '302');
        jump(48 * HOUR + 5 * MINUTE);
      },
    });
    const [card] = await screen.findAllByRole('article');
    expect(within(card).getByText(reading('This code expired on Thu 5 Nov, 14:30. Your parcel is still in locker D22, but this code can no longer open it.'))).toBeInTheDocument();
    expect(within(card).queryByText(reading(/Valid for/))).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Try the code anyway' })).toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: 'Collect' })).not.toBeInTheDocument();
  });

  test('"Try the code anyway" opens the Collect page', async () => {
    clockAt(TUE_1430);
    const { address } = await openApp('/resident', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(48 * HOUR + 5 * MINUTE);
      },
    });
    await person().click(await screen.findByRole('button', { name: 'Try the code anyway' }));
    expect(address()).toBe('/resident/collect');
  });

  test('two collected parcels show under "Collected" 2, the most recently dropped first, with their times and wait', async () => {
    clockAt(new Date(THU_1110.getTime() - HOUR));
    let first;
    let second;
    await openApp('/resident', {
      before: async (api) => {
        first = await drop(api, 'M', '302');
        jump(HOUR);
        second = await drop(api, 'M', '302');
        jump(3 * HOUR + 20 * MINUTE);
        await pickUp(api, second.code);
        await pickUp(api, first.code);
      },
    });
    const shelf = await screen.findByRole('region', { name: /^Collected/ });
    expect(within(shelf).getByText(reading('Collected', '2'))).toBeInTheDocument();
    const cards = within(shelf).getAllByRole('article');
    expect(cards).toHaveLength(2);
    const [latest, earliest] = cards;
    expect(within(latest).getByText(second.door)).toBeInTheDocument();
    expect(within(latest).getByText('Medium locker')).toBeInTheDocument();
    expect(within(latest).getAllByText(second.parcelId).length).toBeGreaterThan(0);
    expect(within(latest).getByText(reading('Arrived Thu 5 Nov, 11:10'))).toBeInTheDocument();
    expect(within(latest).getByText(reading('Collected', 'Thu 5 Nov, 14:30'))).toBeInTheDocument();
    expect(within(latest).getByText(reading('Waited 3h 20m'))).toBeInTheDocument();
    expect(within(latest).getByText('Picked up 1d 20h before the code expired')).toBeInTheDocument();
    expect(within(earliest).getByText(first.door)).toBeInTheDocument();
    expect(within(earliest).getAllByText(first.parcelId).length).toBeGreaterThan(0);
  });

  test('a parcel collected within a minute of arriving reads "Waited less than a minute"', async () => {
    await openApp('/resident', {
      before: async (api) => {
        const { code } = await drop(api, 'M', '302');
        await pickUp(api, code);
      },
    });
    const shelf = await screen.findByRole('region', { name: /^Collected/ });
    expect(within(shelf).getByText(reading('Waited less than a minute'))).toBeInTheDocument();
  });

  test('with nothing waiting but a parcel collected earlier, the empty message and the Collected section both show', async () => {
    await openApp('/resident', {
      before: async (api) => {
        const { code } = await drop(api, 'M', '302');
        await pickUp(api, code);
      },
    });
    expect(await screen.findByRole('heading', { name: 'Nothing waiting for you' })).toBeInTheDocument();
    expect(screen.getByText('No parcels in the wall for flat 302')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Collected/ })).toBeInTheDocument();
  });

  test('with parcels waiting for 302 and 304, switching to flat 304 in the header shows only 304\'s parcels', async () => {
    let for302;
    let for304;
    await openApp('/resident', {
      before: async (api) => {
        for302 = await drop(api, 'M', '302');
        for304 = await drop(api, 'S', '304');
      },
    });
    const user = person();
    expect(await screen.findByText(for302.door)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Rao family/ }));
    const option = screen.getByRole('menuitem', { name: /Rao family/ });
    for (let i = 0; i < 10 && document.activeElement !== option; i += 1) await user.tab();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('option', { name: /304/ }));
    expect(await screen.findByText(for304.door)).toBeInTheDocument();
    expect(screen.queryByText(for302.door)).not.toBeInTheDocument();
    expect(waitingCards()).toHaveLength(1);
  });

  test('with the page left open for a minute, "Valid for … more · until …" counts down by itself', async () => {
    clockAt(TUE_1430);
    await openApp('/resident', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(40 * HOUR + 30 * MINUTE);
      },
    });
    const line = /^Valid for .+ more · until Thu 5 Nov, 14:30$/;
    const before = wordsOf(await screen.findByText(reading(line)));
    await wait(MINUTE);
    await screen.findByText((_, element) => reading(line)(_, element) && wordsOf(element) !== before);
  });

  test('before the flat\'s messages and parcels are read only the title row shows', async () => {
    await openApp('/resident');
    expect(screen.getByRole('heading', { name: 'Hello, Rao family' })).toBeInTheDocument();
    expect(screen.queryByText('Nothing waiting for you')).not.toBeInTheDocument();
    expect(screen.queryByText('No parcels in the wall for flat 302')).not.toBeInTheDocument();
    expect(await screen.findByText('Nothing waiting for you')).toBeInTheDocument();
  });
});

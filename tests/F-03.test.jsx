import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { DAY, HOUR, MINUTE, TUE_1430, clockAt, doorsFrom, drop, jump, wait } from './given.js';
import { reading } from './look.js';

afterEach(() => vi.useRealTimers());

const bank = (size) => screen.getByRole('region', { name: `${size} lockers` });
const platesIn = (region) => within(region).getAllByText(/^D\d\d$/).map((plate) => plate.textContent);

describe('F-03 · The wall', () => {
  test('on an empty wall the five count cards read 48, 48, 0, "—" and 0 with their notes', async () => {
    await openApp('/caretaker/wall');
    expect(await screen.findByText(reading('Total lockers', '48', '20 small · 20 medium · 8 large'))).toBeInTheDocument();
    expect(screen.getByText(reading('Free lockers', '48', 'ready for a parcel'))).toBeInTheDocument();
    expect(screen.getByText(reading('Holding parcels', '0', 'nothing dropped yet'))).toBeInTheDocument();
    expect(screen.getByText(reading('Longest wait', '—', 'dwell time'))).toBeInTheDocument();
    expect(screen.getByText(reading('Codes expired', '0', 'all codes still valid'))).toBeInTheDocument();
  });

  test('the wall shows three banks in number order: Small D01 to D20, Medium D21 to D40, Large D41 to D48, all free', async () => {
    await openApp('/caretaker/wall');
    await screen.findByText('Total lockers');
    const banks = screen.getAllByRole('region', { name: /lockers$/ });
    expect(banks).toHaveLength(3);
    expect(banks[0]).toHaveAccessibleName('Small lockers');
    expect(banks[1]).toHaveAccessibleName('Medium lockers');
    expect(banks[2]).toHaveAccessibleName('Large lockers');
    expect(within(bank('Small')).getByText('Small')).toBeInTheDocument();
    expect(within(bank('Small')).getByText(reading('20/20 free'))).toBeInTheDocument();
    expect(platesIn(bank('Small'))).toEqual(doorsFrom('D01', 'D20'));
    expect(within(bank('Medium')).getByText('Medium')).toBeInTheDocument();
    expect(within(bank('Medium')).getByText(reading('20/20 free'))).toBeInTheDocument();
    expect(platesIn(bank('Medium'))).toEqual(doorsFrom('D21', 'D40'));
    expect(within(bank('Large')).getByText('Large')).toBeInTheDocument();
    expect(within(bank('Large')).getByText(reading('8/8 free'))).toBeInTheDocument();
    expect(platesIn(bank('Large'))).toEqual(doorsFrom('D41', 'D48'));
  });

  test('a parcel that has waited 3h 30m in D21 shows on its door and in the count cards', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/wall', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(3 * HOUR + 30 * MINUTE);
      },
    });
    expect(await screen.findByText(reading('D21', '3h 30m'))).toBeInTheDocument();
    expect(within(bank('Medium')).getByText(reading('19/20 free'))).toBeInTheDocument();
    expect(screen.getByText(reading('Holding parcels', '1', 'waiting for residents'))).toBeInTheDocument();
    expect(screen.getByText(reading('Free lockers', '47', 'ready for a parcel'))).toBeInTheDocument();
    expect(screen.getByText(reading('Longest wait', '3h 30m', 'dwell time'))).toBeInTheDocument();
  });

  test('waits of 5 minutes, 3 hours 30 minutes and 1 day 20 hours read "5m", "3h 30m" and "1d 20h", the longest in the card', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/wall', {
      before: async (api) => {
        await drop(api, 'L', '302');
        jump(DAY + 20 * HOUR - (3 * HOUR + 30 * MINUTE));
        await drop(api, 'M', '304');
        jump(3 * HOUR + 30 * MINUTE - 5 * MINUTE);
        await drop(api, 'S', '404');
        jump(5 * MINUTE);
      },
    });
    expect(await screen.findByText(reading('D41', '1d 20h'))).toBeInTheDocument();
    expect(screen.getByText(reading('D21', '3h 30m'))).toBeInTheDocument();
    expect(screen.getByText(reading('D01', '5m'))).toBeInTheDocument();
    expect(screen.getByText(reading('Longest wait', '1d 20h', 'dwell time'))).toBeInTheDocument();
  });

  test('a parcel still in its locker after its 48-hour free window counts in "Codes expired"', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/wall', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(30 * HOUR);
        await drop(api, 'L', '404');
        jump(18 * HOUR + MINUTE);
      },
    });
    expect(await screen.findByText(reading('Codes expired', '1', 'parcels past their free window'))).toBeInTheDocument();
  });

  test('the legend under the wall shows "Free" and "Holding a parcel"', async () => {
    await openApp('/caretaker/wall');
    expect(await screen.findByText(reading('Free', 'Holding a parcel'))).toBeInTheDocument();
  });

  test('before the wall is read no count cards and no doors show, then they appear', async () => {
    await openApp('/caretaker/wall');
    expect(screen.queryByText('Total lockers')).not.toBeInTheDocument();
    expect(screen.queryByText('Codes expired')).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^D\d\d$/)).toHaveLength(0);
    expect(await screen.findByText(reading('Total lockers', '48', '20 small · 20 medium · 8 large'))).toBeInTheDocument();
    expect(screen.getAllByText(/^D\d\d$/)).toHaveLength(48);
  });

  test('with the wall left open for a minute, D21\'s waiting time and "Longest wait" grow by themselves', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/wall', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(3 * HOUR + 30 * MINUTE);
      },
    });
    expect(await screen.findByText(reading('D21', '3h 30m'))).toBeInTheDocument();
    await wait(MINUTE);
    expect(await screen.findByText(reading('D21', /3h 3[1-9]m/))).toBeInTheDocument();
    expect(screen.queryByText(reading('D21', '3h 30m'))).not.toBeInTheDocument();
    expect(screen.getByText(reading('Longest wait', /3h 3[1-9]m/))).toBeInTheDocument();
  });
});

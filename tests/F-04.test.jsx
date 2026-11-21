import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { HOUR, MINUTE, TUE_1430, clockAt, doorsFrom, drop, fill, jump, person } from './given.js';
import { reading } from './look.js';

afterEach(() => vi.useRealTimers());

const plates = () => screen.getAllByText(/^D\d\d$/).map((plate) => plate.textContent);
const press = (user, name) => user.click(screen.getByRole('button', { name }));

async function openWall(path = '/caretaker/wall', options) {
  const app = await openApp(path, options);
  await screen.findByRole('textbox', { name: 'Find a locker' });
  return { ...app, user: person() };
}

describe('F-04 · Finding one locker', () => {
  test('with no filter "All sizes" and "Any state" are pressed, the find box is empty and no count line shows', async () => {
    await openWall();
    await screen.findAllByRole('button', { name: /^Locker / });
    expect(screen.getByRole('button', { name: 'All sizes', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Any state', pressed: true })).toBeInTheDocument();
    for (const name of ['Small', 'Medium', 'Large', 'Free', 'Holding']) {
      expect(screen.getByRole('button', { name, pressed: false })).toBeInTheDocument();
    }
    expect(screen.getByPlaceholderText('Find a locker, e.g. D07')).toHaveValue('');
    expect(screen.queryByText(reading(/shown · \d+ free/))).not.toBeInTheDocument();
  });

  test('pressing Large shows only the Large bank, puts ?size=L in the address and reads "8 shown · 8 free"', async () => {
    const { user, address } = await openWall();
    await press(user, 'Large');
    expect(await screen.findByText(reading('8 shown · 8 free'))).toBeInTheDocument();
    expect(plates()).toEqual(doorsFrom('D41', 'D48'));
    expect(address()).toMatch(/\?size=L$/);
    expect(screen.getByRole('button', { name: 'Large', pressed: true })).toBeInTheDocument();
  });

  test('pressing Free after Large shows only the free large doors, with size=L and state=free in the address', async () => {
    const { user, address } = await openWall('/caretaker/wall', { before: (api) => drop(api, 'L', '302') });
    await press(user, 'Large');
    await screen.findByText(reading('8 shown · 7 free'));
    await press(user, 'Free');
    expect(await screen.findByText(reading('7 shown · 7 free'))).toBeInTheDocument();
    expect(plates()).toEqual(doorsFrom('D41', 'D48').slice(1));
    const query = new URLSearchParams(address().split('?')[1]);
    expect(query.get('size')).toBe('L');
    expect(query.get('state')).toBe('free');
  });

  test('pressing "All sizes" and "Any state" brings every door back and takes the filters out of the address', async () => {
    const { user, address } = await openWall('/caretaker/wall?size=M&state=free');
    await screen.findByText(reading('20 shown · 20 free'));
    await press(user, 'All sizes');
    await press(user, 'Any state');
    expect(address()).toBe('/caretaker/wall');
    await waitFor(() => expect(plates()).toHaveLength(48));
    expect(screen.queryByText(reading(/shown · \d+ free/))).not.toBeInTheDocument();
  });

  test('opening /caretaker/wall?size=M&state=holding has Medium and Holding pressed and shows only holding medium doors', async () => {
    await openWall('/caretaker/wall?size=M&state=holding', {
      before: async (api) => {
        await drop(api, 'M', '302');
        await drop(api, 'S', '302');
      },
    });
    expect(screen.getByRole('button', { name: 'Medium', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Holding', pressed: true })).toBeInTheDocument();
    expect(await screen.findByText(reading('1 shown · 0 free'))).toBeInTheDocument();
    expect(plates()).toEqual(['D21']);
  });

  test('with filters pressed the count cards still count the whole wall', async () => {
    const { user } = await openWall();
    await waitFor(() => expect(screen.getAllByText('48')).toHaveLength(2));
    await press(user, 'Large');
    await press(user, 'Free');
    await screen.findByText(reading('8 shown · 8 free'));
    expect(screen.getAllByText('48')).toHaveLength(2);
  });

  test('with nothing in any locker, pressing Holding says "No locker matches these filters" in the wall\'s place', async () => {
    const { user } = await openWall();
    await press(user, 'Holding');
    expect(await screen.findByText('No locker matches these filters')).toBeInTheDocument();
    expect(screen.getByText('Nothing is holding a parcel right now.')).toBeInTheDocument();
    expect(screen.queryAllByText(/^D\d\d$/)).toHaveLength(0);
  });

  test('with nothing in any locker, pressing Small as well says "Nothing of this size is holding a parcel right now."', async () => {
    const { user } = await openWall();
    await press(user, 'Holding');
    await press(user, 'Small');
    expect(await screen.findByText('Nothing of this size is holding a parcel right now.')).toBeInTheDocument();
    expect(screen.getByText('No locker matches these filters')).toBeInTheDocument();
    expect(screen.queryByText('Nothing is holding a parcel right now.')).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^D\d\d$/)).toHaveLength(0);
  });

  test('with every small locker holding, pressing Small and Free says "Every locker of this size is in use."', async () => {
    const { user } = await openWall('/caretaker/wall', { before: (api) => fill(api, 'S') });
    await press(user, 'Small');
    await press(user, 'Free');
    expect(await screen.findByText('No locker matches these filters')).toBeInTheDocument();
    expect(screen.getByText('Every locker of this size is in use.')).toBeInTheDocument();
    expect(screen.queryAllByText(/^D\d\d$/)).toHaveLength(0);
  });

  test('with every locker of the wall holding, pressing Free alone says "Every locker is in use."', async () => {
    const before = async (api) => { await fill(api, 'S'); await fill(api, 'M'); await fill(api, 'L'); };
    const { user } = await openWall('/caretaker/wall', { before });
    await press(user, 'Free');
    expect(await screen.findByText('No locker matches these filters')).toBeInTheDocument();
    expect(screen.getByText('Every locker is in use.')).toBeInTheDocument();
    expect(screen.queryByText('Every locker of this size is in use.')).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^D\d\d$/)).toHaveLength(0);
  });

  test('/caretaker/wall?size=XL says "That is not a valid choice", and "Show the whole wall" brings every door back', async () => {
    const { user, address } = await openWall('/caretaker/wall?size=XL');
    expect(await screen.findByText('That is not a valid choice')).toBeInTheDocument();
    expect(screen.getByText('Pick a size: small, medium or large.')).toBeInTheDocument();
    expect(screen.queryAllByText(/^D\d\d$/)).toHaveLength(0);
    await user.click(screen.getByRole('link', { name: 'Show the whole wall' }));
    expect(address()).toBe('/caretaker/wall');
    await waitFor(() => expect(plates()).toHaveLength(48));
  });

  test('/caretaker/wall?tower=B says "That tower is not here" with "Show the whole wall"', async () => {
    await openApp('/caretaker/wall?tower=B');
    expect(await screen.findByText('That tower is not here')).toBeInTheDocument();
    expect(screen.getByText(reading('There is no tower B. This parcel room serves Tower A only.'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Show the whole wall' })).toBeInTheDocument();
  });

  test('typing 7 in the find box and pressing Enter opens D07\'s drawer and empties the box', async () => {
    const { user } = await openWall();
    await user.type(screen.getByPlaceholderText('Find a locker, e.g. D07'), '7{Enter}');
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('heading', { name: 'D07' })).toBeInTheDocument();
    expect(await within(drawer).findByText('Small locker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Find a locker, e.g. D07')).toHaveValue('');
  });

  test('typing D41 in the find box works the same way', async () => {
    const { user } = await openWall();
    await user.type(screen.getByPlaceholderText('Find a locker, e.g. D07'), 'D41{Enter}');
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByRole('heading', { name: 'D41' })).toBeInTheDocument();
    expect(await within(drawer).findByText('Large locker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Find a locker, e.g. D07')).toHaveValue('');
  });

  test('finding D99 opens a drawer that says "No such locker"', async () => {
    const { user } = await openWall();
    await user.type(screen.getByPlaceholderText('Find a locker, e.g. D07'), 'D99{Enter}');
    const drawer = screen.getByRole('dialog');
    expect(await within(drawer).findByText('No such locker')).toBeInTheDocument();
    expect(within(drawer).getByText(reading('Tower A has no locker D99. Lockers run from D01 to D48.'))).toBeInTheDocument();
  });

  test('clicking free D05 opens a drawer with "Small locker", "D05", a picture of the door and the free line', async () => {
    const { user } = await openWall();
    await user.click(screen.getByRole('button', { name: 'Locker D05, free' }));
    const drawer = screen.getByRole('dialog');
    expect(await within(drawer).findByText('Small locker')).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: 'D05' })).toBeInTheDocument();
    expect(within(drawer).getAllByText('D05')).toHaveLength(2);
    expect(within(drawer).getByText('Free. Nothing is inside, so the next small parcel can go here.')).toBeInTheDocument();
  });

  test('clicking D21, holding P001 for flat 302, shows the parcel, the flat, the wait and until when its code works', async () => {
    clockAt(TUE_1430);
    const { user } = await openWall('/caretaker/wall', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(3 * HOUR + 30 * MINUTE);
      },
    });
    await user.click(screen.getByRole('button', { name: 'Locker D21, holding a parcel' }));
    const drawer = screen.getByRole('dialog');
    expect(await within(drawer).findByText('Medium locker')).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: 'D21' })).toBeInTheDocument();
    expect(within(drawer).getByText(reading('Holding', 'P001'))).toBeInTheDocument();
    expect(within(drawer).getByText(reading('For', 'Flat 302 · Rao'))).toBeInTheDocument();
    expect(within(drawer).getByText(reading('Waiting', '3h 30m'))).toBeInTheDocument();
    expect(await within(drawer).findByText(reading('Code', 'Valid until Thu 5 Nov, 14:30'))).toBeInTheDocument();
  });

  test('a door whose code\'s free window has ended reads "Expired" with the day and time in its drawer', async () => {
    clockAt(TUE_1430);
    const { user } = await openWall('/caretaker/wall', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(48 * HOUR + 10 * MINUTE);
      },
    });
    await user.click(screen.getByRole('button', { name: 'Locker D21, holding a parcel' }));
    const drawer = screen.getByRole('dialog');
    expect(await within(drawer).findByText(reading('Code', 'Expired Thu 5 Nov, 14:30'))).toBeInTheDocument();
    expect(within(drawer).queryByText(/Valid until/)).not.toBeInTheDocument();
  });

  test('every drawer\'s foot says pickup codes are never shown, and no code appears in it', async () => {
    let code;
    const { user } = await openWall('/caretaker/wall', {
      before: async (api) => {
        ({ code } = await drop(api, 'M', '302'));
      },
    });
    const foot = 'Pickup codes are never shown here: the wall keeps only a fingerprint of each one. The resident has the code.';
    await user.click(screen.getByRole('button', { name: 'Locker D21, holding a parcel' }));
    let drawer = screen.getByRole('dialog');
    await within(drawer).findByText(reading('For', 'Flat 302 · Rao'));
    expect(within(drawer).getByText(foot)).toBeInTheDocument();
    expect(within(drawer).queryByText(new RegExp(code))).not.toBeInTheDocument();
    expect(within(drawer).queryByText(new RegExp(code.slice(0, 3) + ' ' + code.slice(3)))).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Locker D05, free' }));
    drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText(foot)).toBeInTheDocument();
  });

  test('while the clicked door is still being read, its drawer already shows "Locker" and the door\'s number', async () => {
    await openWall('/caretaker/wall', { before: (api) => drop(api, 'M', '302') });
    // A plain click, looked at in the same moment: the door's answer has not arrived yet.
    fireEvent.click(screen.getByRole('button', { name: 'Locker D21, holding a parcel' }));
    const drawer = screen.getByRole('dialog');
    expect(within(drawer).getByText('Locker')).toBeInTheDocument();
    expect(within(drawer).getByRole('heading', { name: 'D21' })).toBeInTheDocument();
    expect(within(drawer).queryByText('For')).not.toBeInTheDocument();
    expect(await within(drawer).findByText('Medium locker')).toBeInTheDocument();
    expect(within(drawer).getByText(reading('For', 'Flat 302 · Rao'))).toBeInTheDocument();
  });

  test('✕ (Close) closes the drawer and the focus goes back to the door it was opened from', async () => {
    const { user } = await openWall();
    const door = screen.getByRole('button', { name: 'Locker D05, free' });
    await user.click(door);
    const close = within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' });
    await waitFor(() => expect(close).toHaveFocus());
    await user.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Locker D05, free' })).toHaveFocus());
  });

  test('Esc closes the drawer, the filters stay as they were, and the focus goes back to the door', async () => {
    const { user, address } = await openWall('/caretaker/wall?size=L');
    await screen.findByText(reading('8 shown · 8 free'));
    await user.click(screen.getByRole('button', { name: 'Locker D41, free' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(address()).toMatch(/\?size=L$/);
    expect(screen.getByRole('button', { name: 'Large', pressed: true })).toBeInTheDocument();
    expect(plates()).toEqual(doorsFrom('D41', 'D48'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Locker D41, free' })).toHaveFocus());
  });

  test('a drawer opened from the find box gives the focus back to the find box when it closes', async () => {
    const { user } = await openWall();
    await user.type(screen.getByPlaceholderText('Find a locker, e.g. D07'), '7{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByPlaceholderText('Find a locker, e.g. D07')).toHaveFocus());
  });
});

import { cleanup, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { openApp } from './app.jsx';
import { drop, person } from './given.js';

const personButton = (name) => screen.getByRole('button', { name: new RegExp(name) });

async function openMenu(path = '/caretaker/wall', options) {
  const app = await openApp(path, options);
  const user = person();
  await user.click(personButton('Farida'));
  return { ...app, user, menu: screen.getByRole('menu') };
}

/** Tabs to the resident option and presses Enter, as the keyboard does (the flats then stay open while a flat is clicked). */
async function openFlats(user, menu) {
  const option = within(menu).getByRole('menuitem', { name: /Rao family/ });
  for (let i = 0; i < 10 && document.activeElement !== option; i += 1) await user.tab();
  expect(option).toHaveFocus();
  await user.keyboard('{Enter}');
}

describe('F-02 · Moving between people', () => {
  test('on the home page the header has the logo and no ← button or person button', async () => {
    await openApp('/');
    const logo = screen.getByRole('link', { name: 'LockerLine home' });
    expect(within(logo).getByText('LockerLine')).toBeInTheDocument();
    expect(within(logo).getByText('Sunrise Heights · Tower A')).toBeInTheDocument();
    expect(screen.queryByLabelText('Back to the home page')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Farida|Imran|family/ })).not.toBeInTheDocument();
  });

  test('the ← button (Back to the home page) on a person\'s page goes home', async () => {
    const { address } = await openApp('/courier');
    await person().click(screen.getByLabelText('Back to the home page'));
    expect(address()).toBe('/');
  });

  test('the logo on a person\'s page goes home', async () => {
    const { address } = await openApp('/caretaker/wall');
    await person().click(screen.getByRole('link', { name: 'LockerLine home' }));
    expect(address()).toBe('/');
  });

  test('the person button shows Farida, Imran or the Rao family with their role and initial', async () => {
    const pages = [
      ['/caretaker/wall', 'Farida', 'Caretaker', 'F'],
      ['/courier', 'Imran', 'Courier', 'I'],
      ['/resident', 'Rao family', 'Resident · Flat 302', 'R'],
    ];
    for (const [path, name, role, initial] of pages) {
      await openApp(path);
      const button = personButton(name);
      expect(within(button).getByText(name)).toBeInTheDocument();
      expect(within(button).getByText(role)).toBeInTheDocument();
      expect(within(button).getByText(initial)).toBeInTheDocument();
      cleanup();
    }
  });

  test('the person button opens "View the parcel room as" with Farida, Imran and the Rao family', async () => {
    const { menu } = await openMenu();
    expect(within(menu).getByText('View the parcel room as')).toBeInTheDocument();
    const options = within(menu).getAllByRole('menuitem');
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveAccessibleName(/Farida.*Caretaker/);
    expect(options[1]).toHaveAccessibleName(/Imran.*Courier/);
    expect(options[2]).toHaveAccessibleName(/Rao family.*Resident · Flat 302/);
  });

  test('choosing Imran closes the menu and opens /courier with Imran in the header', async () => {
    const { user, menu, address } = await openMenu();
    await user.click(within(menu).getByRole('menuitem', { name: /Imran/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/courier');
    expect(personButton('Imran')).toBeInTheDocument();
  });

  test('pointing at the resident option opens "Which resident are you?" with the 16 flats, floor by floor', async () => {
    const { user, menu } = await openMenu();
    await user.hover(within(menu).getByRole('menuitem', { name: /Rao family/ }));
    expect(screen.getByText('Which resident are you?')).toBeInTheDocument();
    for (const floor of ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4']) expect(screen.getByText(floor)).toBeInTheDocument();
    const flats = screen.getAllByRole('option');
    expect(flats).toHaveLength(16);
    expect(flats[0]).toHaveAccessibleName(/101.*Iyer/);
    expect(flats[15]).toHaveAccessibleName(/404.*Jain/);
    expect(screen.getByRole('option', { name: /302.*Rao/, selected: true })).toBeInTheDocument();
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1);
  });

  test('the resident option opens the flats with Enter, as a click does', async () => {
    const { user, menu } = await openMenu();
    await openFlats(user, menu);
    expect(screen.getByText('Which resident are you?')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(16);
  });

  test('pointing at the resident option and then clicking it keeps the flats open', async () => {
    const { user, menu } = await openMenu();
    const resident = within(menu).getByRole('menuitem', { name: /Rao family/ });
    await user.hover(resident);
    await user.click(resident);
    expect(screen.getByText('Which resident are you?')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(16);
  });

  test('choosing 304 Chawla closes the menu and makes the app the Chawla family\'s on /resident', async () => {
    const { user, menu, address } = await openMenu();
    await openFlats(user, menu);
    await user.click(screen.getByRole('option', { name: /304.*Chawla/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/resident');
    expect(screen.getByText('Flat 304')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello, Chawla family' })).toBeInTheDocument();
    const button = personButton('Chawla family');
    expect(within(button).getByText('Resident · Flat 304')).toBeInTheDocument();
  });

  test('a flat with a parcel waiting carries a dot, and the foot of the flats explains it', async () => {
    const { user, menu } = await openMenu('/caretaker/wall', { before: (api) => drop(api, 'S', '302') });
    await user.hover(within(menu).getByRole('menuitem', { name: /Rao family/ }));
    const flat302 = screen.getByRole('option', { name: /302/ });
    expect(await within(flat302).findByTitle('A parcel is waiting')).toBeInTheDocument();
    expect(within(screen.getByRole('option', { name: /304/ })).queryByTitle('A parcel is waiting')).not.toBeInTheDocument();
    expect(screen.getByText('A parcel is waiting')).toBeInTheDocument();
  });

  test('Esc closes the person menu and nothing changes', async () => {
    const { user, address } = await openMenu();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/caretaker/wall');
    expect(personButton('Farida')).toBeInTheDocument();
  });

  test('a click outside the person menu closes it and nothing changes', async () => {
    const { user, address } = await openMenu();
    await user.click(screen.getByRole('heading', { name: 'The wall' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/caretaker/wall');
    expect(personButton('Farida')).toBeInTheDocument();
  });

  test('clicking the person button again closes the menu and nothing changes', async () => {
    const { user, address } = await openMenu();
    await user.click(personButton('Farida'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(address()).toBe('/caretaker/wall');
  });

  test('after choosing flat 304, a refresh makes the app the Rao family of flat 302 again', async () => {
    const { user, menu, address } = await openMenu();
    await openFlats(user, menu);
    await user.click(screen.getByRole('option', { name: /304.*Chawla/ }));
    expect(personButton('Chawla family')).toBeInTheDocument();
    cleanup();
    await openApp(address());
    expect(personButton('Rao family')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello, Rao family' })).toBeInTheDocument();
  });

  test('the wall\'s title row reads "Tower A parcel room" and "The wall", with The wall tab filled', async () => {
    await openApp('/caretaker/wall');
    expect(screen.getByText('Tower A parcel room')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'The wall' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^The wall/, current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Parcels/, current: false })).toBeInTheDocument();
  });

  test('the Parcels tab opens /caretaker/parcels, whose title row reads "Every drop, code and opening" and "Parcels"', async () => {
    const { address } = await openApp('/caretaker/wall');
    await person().click(screen.getByRole('link', { name: /^Parcels/ }));
    expect(address()).toBe('/caretaker/parcels');
    expect(screen.getByText('Every drop, code and opening')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Parcels' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Parcels/, current: 'page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^The wall/, current: false })).toBeInTheDocument();
  });

  test('with three lockers holding parcels the Parcels tab carries a badge with 3', async () => {
    await openApp('/caretaker/wall', {
      before: async (api) => {
        await drop(api, 'S', '302');
        await drop(api, 'M', '304');
        await drop(api, 'L', '302');
      },
    });
    const tab = screen.getByRole('link', { name: /^Parcels/ });
    expect(await within(tab).findByText('3')).toBeInTheDocument();
  });

  test('with no locker holding anything the Parcels tab has no badge', async () => {
    await openApp('/caretaker/parcels');
    await screen.findByRole('link', { name: /^The wall/ });
    expect(screen.getByRole('link', { name: /^Parcels/ })).toHaveAccessibleName('Parcels');
  });

  test('the courier\'s title row reads "Drop-off · Tower A" and "Get a locker", with no tabs', async () => {
    await openApp('/courier');
    expect(screen.getByText('Drop-off · Tower A')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Get a locker' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  test('the resident with nothing waiting sees "Flat 302" and "Hello, Rao family", with no tabs', async () => {
    await openApp('/resident');
    expect(screen.getByText('Flat 302')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hello, Rao family' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^My parcels/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Collect/ })).not.toBeInTheDocument();
  });

  test('with two parcels waiting the resident has the tabs My parcels and Collect, and Collect carries a badge with 2', async () => {
    await openApp('/resident', {
      before: async (api) => {
        await drop(api, 'S', '302');
        await drop(api, 'M', '302');
      },
    });
    expect(await screen.findByRole('link', { name: /^My parcels/ })).toBeInTheDocument();
    const collect = screen.getByRole('link', { name: /^Collect/ });
    expect(within(collect).getByText('2')).toBeInTheDocument();
  });

  test('on /resident/collect with nothing waiting the title row reads "Lobby keypad" and "Collect a parcel", with both tabs', async () => {
    await openApp('/resident/collect');
    expect(screen.getByText('Lobby keypad')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Collect a parcel' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /^My parcels/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Collect/, current: 'page' })).toBeInTheDocument();
  });

  test('/caretaker leads to /caretaker/wall', async () => {
    const { address } = await openApp('/caretaker');
    expect(address()).toBe('/caretaker/wall');
    expect(screen.getByRole('heading', { name: 'The wall' })).toBeInTheDocument();
  });

  test('/caretaker/parcels/P001 leads to /caretaker/parcels', async () => {
    const { address } = await openApp('/caretaker/parcels/P001');
    expect(address()).toBe('/caretaker/parcels');
    expect(screen.getByRole('heading', { name: 'Parcels' })).toBeInTheDocument();
  });

  test('an address the app does not have, such as /lobby, leads to the home page', async () => {
    const { address } = await openApp('/lobby');
    expect(address()).toBe('/');
    expect(screen.getByRole('link', { name: 'LockerLine home' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Back to the home page')).not.toBeInTheDocument();
  });
});

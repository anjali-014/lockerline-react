import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { TUE_1430, clockAt, person, wait } from './given.js';
import { pageWords, reading } from './look.js';

afterEach(() => vi.useRealTimers());

const parcel = () => screen.getByRole('button', { name: /^Parcel .+ for flat/ });

async function openCourier() {
  clockAt(TUE_1430);
  const app = await openApp('/courier');
  await screen.findByRole('button', { name: 'Get a locker' });
  return { ...app, user: person() };
}

async function askFor(user, size, flat) {
  await user.click(screen.getByRole('radio', { name: new RegExp(size, 'i') }));
  await user.type(screen.getByRole('textbox'), flat);
  await user.click(screen.getByRole('button', { name: 'Get a locker' }));
  await screen.findByRole('button', { name: /^Parcel .+ for flat/ });
}

/** Puts the parcel in with a tap and lets the door close and the message arrive. */
async function finishDrop(user) {
  await user.click(parcel());
  await wait(1200);
  await screen.findByText('The wall shows it holding.');
  await wait(1500);
  await screen.findByRole('link', { name: 'See as resident' });
}

describe('F-06 · Putting the parcel in', () => {
  test('when D21 is given, the step panel shows D21 open with parcel P001 for Flat 302 beside it', async () => {
    const { user } = await openCourier();
    await askFor(user, 'medium', '302');
    expect(screen.getByText('Put the parcel in the locker')).toBeInTheDocument();
    expect(screen.getByText('Locker closed')).toBeInTheDocument();
    const box = screen.getByRole('button', { name: 'Parcel P001 for flat 302. Put it in locker D21' });
    expect(within(box).getByText('P001')).toBeInTheDocument();
    expect(within(box).getByText('Flat 302')).toBeInTheDocument();
    expect(screen.getByText(reading('Drag the parcel into D21'))).toBeInTheDocument();
    expect(screen.getByText('Or tap the parcel. The locker closes by itself.')).toBeInTheDocument();
  });

  test('while the step panel is open the form is locked', async () => {
    const { user } = await openCourier();
    await askFor(user, 'medium', '302');
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Get a locker' })).toBeDisabled();
  });

  test('putting the parcel in (the tap that stands in for a drag) moves the panel to "Closing the locker…"', async () => {
    const { user } = await openCourier();
    await askFor(user, 'medium', '302');
    await user.click(parcel());
    expect(screen.getByText('Closing the locker…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Parcel P001 for flat 302. Put it in locker D21' })).not.toBeInTheDocument();
    expect(screen.queryByText(reading('Drag the parcel into D21'))).not.toBeInTheDocument();
  });

  test('tapping the parcel with a finger puts it in the same way', async () => {
    const { user } = await openCourier();
    await askFor(user, 'medium', '302');
    await user.pointer({ keys: '[TouchA]', target: parcel() });
    expect(screen.getByText('Closing the locker…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Parcel P001 for flat 302. Put it in locker D21' })).not.toBeInTheDocument();
  });

  test('about a second after the parcel goes in, the panel says "D21 is closed and holding P001"', async () => {
    const { user } = await openCourier();
    await askFor(user, 'medium', '302');
    await user.click(parcel());
    expect(screen.queryByText('The wall shows it holding.')).not.toBeInTheDocument();
    await wait(1200);
    expect(await screen.findByText(reading('D21 is closed and holding P001'))).toBeInTheDocument();
    expect(screen.getByText('The wall shows it holding.')).toBeInTheDocument();
    expect(screen.queryByText('Closing the locker…')).not.toBeInTheDocument();
  });

  test('the message to the resident first says it is sending, then that it was delivered with until when the code works', async () => {
    const { user } = await openCourier();
    await askFor(user, 'medium', '302');
    await user.click(parcel());
    await wait(1200);
    expect(await screen.findByText('Sending the pickup code to Flat 302')).toBeInTheDocument();
    expect(screen.queryByText('SMS delivered to the Rao family')).not.toBeInTheDocument();
    await wait(1500);
    expect(await screen.findByText('Pickup code sent to Flat 302')).toBeInTheDocument();
    expect(screen.getByText(reading('SMS delivered to the Rao family'))).toBeInTheDocument();
    expect(screen.getByText('The code is valid until Thu 5 Nov, 14:30, counted from the drop.')).toBeInTheDocument();
    expect(screen.queryByText('Sending the pickup code to Flat 302')).not.toBeInTheDocument();
  });

  test('when the drop is done the pickup code appears nowhere on the courier\'s screen', async () => {
    const { user, api } = await openCourier();
    await askFor(user, 'medium', '302');
    await finishDrop(user);
    const { body } = await api.get('/phones/302/messages');
    const { code } = body.messages[0];
    const words = pageWords();
    expect(words).not.toContain(code);
    expect(words).not.toContain(code.slice(0, 3) + ' ' + code.slice(3));
  });

  test('"See as resident" for a parcel to 304 opens /resident?flat=304 as the Chawla family', async () => {
    const { user, address } = await openCourier();
    await askFor(user, 'medium', '304');
    await finishDrop(user);
    await user.click(screen.getByRole('link', { name: 'See as resident' }));
    expect(address()).toBe('/resident?flat=304');
    expect(await screen.findByRole('heading', { name: 'Hello, Chawla family' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Chawla family/ })).toBeInTheDocument();
  });

  test('OK takes the step panel away and leaves the form unlocked and empty', async () => {
    const { user } = await openCourier();
    await askFor(user, 'medium', '302');
    await finishDrop(user);
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByText('Put the parcel in the locker')).not.toBeInTheDocument();
    expect(screen.getByText('Your locker appears here')).toBeInTheDocument();
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeEnabled();
      expect(radio).not.toBeChecked();
    }
    expect(screen.getByRole('textbox')).toBeEnabled();
    expect(screen.getByRole('textbox')).toHaveValue('');
  });

  test('the title row goes from "0 dropped this round" to "2 dropped this round" after two lockers are given', async () => {
    const { user } = await openCourier();
    expect(screen.getByText(reading('0 dropped this round'))).toBeInTheDocument();
    await askFor(user, 'medium', '302');
    await finishDrop(user);
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await askFor(user, 'medium', '304');
    expect(screen.getByText(reading('2 dropped this round'))).toBeInTheDocument();
  });

  test('leaving the courier\'s page and coming back starts the count again at 0', async () => {
    const { user, address } = await openCourier();
    await askFor(user, 'medium', '302');
    await finishDrop(user);
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByText(reading('1 dropped this round'))).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'LockerLine home' }));
    await user.click(screen.getByRole('link', { name: /Continue as Imran/ }));
    expect(address()).toBe('/courier');
    expect(screen.getByText(reading('0 dropped this round'))).toBeInTheDocument();
  });

  test('after a parcel has gone into D21, the wall shows D21 holding', async () => {
    const { user, address } = await openCourier();
    await askFor(user, 'medium', '302');
    await finishDrop(user);
    await user.click(screen.getByRole('link', { name: 'LockerLine home' }));
    await user.click(screen.getByRole('link', { name: /Continue as Farida/ }));
    expect(address()).toBe('/caretaker/wall');
    expect(await screen.findByRole('button', { name: /D21.*holding/ })).toBeInTheDocument();
  });
});

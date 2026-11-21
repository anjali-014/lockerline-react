import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { HOUR, MINUTE, TUE_1430, clockAt, drop, jump, person, pickUp } from './given.js';
import { reading } from './look.js';

afterEach(() => vi.useRealTimers());

const slots = () => screen.getByLabelText(/^Code: \d of 6 digits$/);
const openButton = () => screen.getByRole('button', { name: 'Open my locker' });

async function openKeypad(options) {
  const app = await openApp('/resident/collect', options);
  return { ...app, user: person() };
}

/** Presses the screen keys, one digit after another. */
async function keyIn(user, digits) {
  for (const digit of digits) await user.click(screen.getByRole('button', { name: digit }));
}

describe('F-08 · The lobby keypad', () => {
  test('the Collect page shows the line, six empty slots, "Enter your code", the twelve keys and "Open my locker"', async () => {
    await openKeypad();
    expect(screen.getByText('Key the six-digit code from your message. The locker holding your parcel opens, once.')).toBeInTheDocument();
    expect(screen.getByLabelText('Code: 0 of 6 digits')).toBeInTheDocument();
    expect(screen.getByText('Enter your code')).toBeInTheDocument();
    for (const digit of '1234567890') expect(screen.getByRole('button', { name: digit })).toHaveTextContent(digit);
    expect(screen.getByRole('button', { name: 'Clear' })).toHaveTextContent('C');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveTextContent('⌫');
    expect(openButton()).toBeInTheDocument();
  });

  test('pressing 4, 8 and 2 fills the first three slots with 4, 8 and 2', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '482');
    expect(screen.getByLabelText('Code: 3 of 6 digits')).toBeInTheDocument();
    expect(within(slots()).getByText(reading('4', '8', '2'))).toBeInTheDocument();
  });

  test('with six digits keyed, another digit changes nothing', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '482019');
    await keyIn(user, '7');
    expect(screen.getByLabelText('Code: 6 of 6 digits')).toBeInTheDocument();
    expect(within(slots()).getByText(reading('4', '8', '2', '0', '1', '9'))).toBeInTheDocument();
    expect(within(slots()).queryByText('7')).not.toBeInTheDocument();
  });

  test('⌫ takes the last digit away', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '482');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByLabelText('Code: 2 of 6 digits')).toBeInTheDocument();
    expect(within(slots()).getByText(reading('4', '8'))).toBeInTheDocument();
    expect(within(slots()).queryByText('2')).not.toBeInTheDocument();
  });

  test('C empties every slot', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '482');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByLabelText('Code: 0 of 6 digits')).toBeInTheDocument();
    expect(within(slots()).queryByText(/\d/)).not.toBeInTheDocument();
  });

  test('the keyboard keys digits, Backspace takes the last one away and Escape clears them all', async () => {
    const { user } = await openKeypad();
    await user.keyboard('482');
    expect(screen.getByLabelText('Code: 3 of 6 digits')).toBeInTheDocument();
    expect(within(slots()).getByText(reading('4', '8', '2'))).toBeInTheDocument();
    await user.keyboard('{Backspace}');
    expect(screen.getByLabelText('Code: 2 of 6 digits')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.getByLabelText('Code: 0 of 6 digits')).toBeInTheDocument();
  });

  test('with six digits keyed, Enter on the keyboard does the same as "Open my locker"', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '482019');
    await user.keyboard('{Enter}');
    expect(await screen.findByText(reading("That code doesn't match a parcel. Check the digits and try again."))).toBeInTheDocument();
  });

  test('after pressing screen keys, Enter only does what "Open my locker" does: the code stays as keyed', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '12');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('group', { name: 'Code: 2 of 6 digits' })).toBeInTheDocument();
    expect(within(slots()).getByText(reading('1', '2'))).toBeInTheDocument();
    expect(screen.getByText(reading('Enter all six digits. The code from your message has six digits.'))).toBeInTheDocument();
  });

  test('"Open my locker" with four digits says "Enter all six digits." and nothing else happens', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '4820');
    await user.click(openButton());
    expect(screen.getByText(reading('Enter all six digits. The code from your message has six digits.'))).toBeInTheDocument();
    expect(screen.getByLabelText('Code: 4 of 6 digits')).toBeInTheDocument();
    expect(openButton()).toBeInTheDocument();
  });

  test('six digits that are no parcel\'s code get "That code doesn\'t match a parcel." and no locker opens', async () => {
    let code;
    const { user } = await openKeypad({ before: async (api) => { ({ code } = await drop(api, 'M', '302')); } });
    await keyIn(user, code === '000000' ? '111111' : '000000');
    await user.click(openButton());
    const message = await screen.findByRole('alert');
    expect(message).toHaveTextContent("That code doesn't match a parcel. Check the digits and try again.");
    expect(openButton()).toBeInTheDocument();
    expect(screen.getByLabelText('Code: 6 of 6 digits')).toBeInTheDocument();
  });

  test('the code of a parcel whose free window has ended gets "This code has expired."', async () => {
    clockAt(TUE_1430);
    let code;
    const { user } = await openKeypad({
      before: async (api) => {
        ({ code } = await drop(api, 'M', '302'));
        jump(48 * HOUR + 5 * MINUTE);
      },
    });
    await keyIn(user, code);
    await user.click(openButton());
    expect(await screen.findByText(reading('This code has expired. Its free window has ended, so it can no longer open the locker.'))).toBeInTheDocument();
    expect(openButton()).toBeInTheDocument();
  });

  test('a code that has already opened its locker gets "This code was already used."', async () => {
    let code;
    const { user } = await openKeypad({
      before: async (api) => {
        ({ code } = await drop(api, 'M', '302'));
        await pickUp(api, code);
      },
    });
    await keyIn(user, code);
    await user.click(openButton());
    expect(await screen.findByText(reading('This code was already used. A code opens its locker once. The parcel has been collected.'))).toBeInTheDocument();
    expect(openButton()).toBeInTheDocument();
  });

  test('after a refusal any key brings "Enter your code" back, and "Open my locker" refuses again', async () => {
    const { user } = await openKeypad();
    await keyIn(user, '482');
    await user.click(openButton());
    expect(screen.getByText(reading('Enter all six digits. The code from your message has six digits.'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Enter your code')).toBeInTheDocument();
    expect(screen.queryByText(reading('Enter all six digits. The code from your message has six digits.'))).not.toBeInTheDocument();
    await user.click(openButton());
    expect(screen.getByText(reading('Enter all six digits. The code from your message has six digits.'))).toBeInTheDocument();
  });

  test('coming from a parcel card\'s button on My parcels, the six slots already hold that parcel\'s code', async () => {
    let code;
    const { address } = await openApp('/resident', { before: async (api) => { ({ code } = await drop(api, 'M', '302')); } });
    await person().click(await screen.findByRole('button', { name: 'Collect' }));
    expect(address()).toBe('/resident/collect');
    expect(screen.getByLabelText('Code: 6 of 6 digits')).toBeInTheDocument();
    expect(within(slots()).getByText(reading(...code.split('')))).toBeInTheDocument();
  });
});

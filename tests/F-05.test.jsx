import { screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { openApp } from './app.jsx';
import { fill, person } from './given.js';
import { pageWords, reading } from './look.js';

const size = (name) => screen.getByRole('radio', { name: new RegExp(`^${name}`) });
const flatBox = () => screen.getByRole('textbox', { name: /Flat number/ });
const getALocker = () => screen.getByRole('button', { name: 'Get a locker' });

async function openForm(options) {
  const app = await openApp('/courier', options);
  await screen.findAllByText(/free$|^Full$/);
  return { ...app, user: person() };
}

describe('F-05 · The courier asks for a locker', () => {
  test('on an empty wall the form shows the three sizes with what fits and how many are free, the flat box and "Get a locker"', async () => {
    await openForm();
    expect(screen.getByText('Parcel size')).toBeInTheDocument();
    expect(screen.getByText(reading('Small', 'Envelopes, books, phone boxes', '20 free'))).toBeInTheDocument();
    expect(screen.getByText(reading('Medium', 'Shoe boxes, groceries, kits', '20 free'))).toBeInTheDocument();
    expect(screen.getByText(reading('Large', 'Monitors, cartons, luggage', '8 free'))).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByText('Flat number')).toBeInTheDocument();
    expect(flatBox()).toHaveAccessibleDescription('Written on the parcel label. Flats 101 to 404.');
    expect(getALocker()).toBeInTheDocument();
  });

  test('beside the form a panel waits: "Your locker appears here"', async () => {
    await openForm();
    expect(screen.getByText('Your locker appears here')).toBeInTheDocument();
    expect(screen.getByText("Pick the parcel's size, type the flat number, and the wall chooses a locker for you.")).toBeInTheDocument();
  });

  test('clicking the Medium card chooses it, and only one size can be chosen at a time', async () => {
    const { user } = await openForm();
    await user.click(screen.getByText('Small'));
    expect(size('Small')).toBeChecked();
    await user.click(screen.getByText('Medium'));
    expect(size('Medium')).toBeChecked();
    expect(size('Small')).not.toBeChecked();
    expect(size('Large')).not.toBeChecked();
  });

  test('typing 302 in the flat box shows "Rao"', async () => {
    const { user } = await openForm();
    expect(screen.queryByText('Rao')).not.toBeInTheDocument();
    await user.type(flatBox(), '302');
    expect(screen.getByText('Rao')).toBeInTheDocument();
  });

  test('typing 30, or 999, shows no name', async () => {
    const { user } = await openForm();
    const before = pageWords();
    await user.type(flatBox(), '30');
    expect(pageWords()).toBe(before);
    await user.clear(flatBox());
    await user.type(flatBox(), '999');
    expect(pageWords()).toBe(before);
    await user.clear(flatBox());
    await user.type(flatBox(), '302');
    expect(screen.getByText('Rao')).toBeInTheDocument();
  });

  test('Medium and flat 999 is refused in place: "Flat 999 is not in Tower A." and "Unknown flat", and no count changes', async () => {
    const { user } = await openForm();
    await user.click(screen.getByText('Medium'));
    await user.type(flatBox(), '999');
    await user.click(getALocker());
    expect(await screen.findByText('Flat 999 is not in Tower A.')).toBeInTheDocument();
    expect(flatBox()).toHaveAccessibleDescription('Flat 999 is not in Tower A.');
    const panel = screen.getByRole('alert');
    expect(within(panel).getByText('Unknown flat')).toBeInTheDocument();
    expect(within(panel).getByText('There is no flat 999 in this tower. Nothing was booked and no locker was taken.')).toBeInTheDocument();
    expect(screen.getByText(reading('Small', 'Envelopes, books, phone boxes', '20 free'))).toBeInTheDocument();
    expect(screen.getByText(reading('Medium', 'Shoe boxes, groceries, kits', '20 free'))).toBeInTheDocument();
    expect(screen.getByText(reading('Large', 'Monitors, cartons, luggage', '8 free'))).toBeInTheDocument();
  });

  test('with no size and no flat, both fields show their error and the panel says "That is not a valid choice"', async () => {
    const { user } = await openForm();
    await user.click(getALocker());
    expect(await screen.findByText('Choose small, medium or large.')).toBeInTheDocument();
    expect(flatBox()).toHaveAccessibleDescription('A flat number is three digits, like 302.');
    const panel = screen.getByRole('alert');
    expect(within(panel).getByText('That is not a valid choice')).toBeInTheDocument();
    expect(within(panel).getByText('Pick a size: small, medium or large. Type the flat number first.')).toBeInTheDocument();
    expect(within(panel).getByText('Nothing was booked and no locker was taken.')).toBeInTheDocument();
  });

  test('with a size but no flat, only the flat box shows its error and the panel says "Type the flat number first."', async () => {
    const { user } = await openForm();
    await user.click(screen.getByText('Small'));
    await user.click(getALocker());
    expect(await screen.findByText('A flat number is three digits, like 302.')).toBeInTheDocument();
    expect(screen.queryByText('Choose small, medium or large.')).not.toBeInTheDocument();
    const panel = screen.getByRole('alert');
    expect(within(panel).getByText('Type the flat number first.')).toBeInTheDocument();
  });

  test('choosing a size after an error takes the errors and the message away and brings the waiting panel back', async () => {
    const { user } = await openForm();
    await user.click(getALocker());
    await screen.findByText('Choose small, medium or large.');
    await user.click(screen.getByText('Large'));
    expect(screen.queryByText('Choose small, medium or large.')).not.toBeInTheDocument();
    expect(screen.queryByText('A flat number is three digits, like 302.')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Your locker appears here')).toBeInTheDocument();
  });

  test('changing the flat after an error takes the errors and the message away and brings the waiting panel back', async () => {
    const { user } = await openForm();
    await user.click(screen.getByText('Medium'));
    await user.type(flatBox(), '999');
    await user.click(getALocker());
    await screen.findByText('Flat 999 is not in Tower A.');
    await user.type(flatBox(), '{Backspace}');
    expect(screen.queryByText('Flat 999 is not in Tower A.')).not.toBeInTheDocument();
    expect(screen.queryByText('Unknown flat')).not.toBeInTheDocument();
    expect(screen.getByText('Your locker appears here')).toBeInTheDocument();
  });

  test('with every large locker holding, the Large card reads "Full"', async () => {
    await openForm({ before: (api) => fill(api, 'L') });
    expect(screen.getByText(reading('Large', 'Monitors, cartons, luggage', 'Full'))).toBeInTheDocument();
    expect(screen.getByText(reading('Medium', 'Shoe boxes, groceries, kits', '20 free'))).toBeInTheDocument();
  });

  test('asking for a full size says "No free locker of that size" and offers the sizes that are free right now', async () => {
    const { user } = await openForm({ before: (api) => fill(api, 'L') });
    await user.click(screen.getByText('Large'));
    await user.type(flatBox(), '302');
    await user.click(getALocker());
    const panel = await screen.findByRole('alert');
    expect(within(panel).getByText('No free locker of that size')).toBeInTheDocument();
    expect(within(panel).getByText('Free right now: small and medium.')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Use a small locker' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Use a medium locker' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Use a large locker' })).not.toBeInTheDocument();
    expect(within(panel).getByText('If it fits nowhere else, wait for a locker to free up or take the parcel back to the depot.')).toBeInTheDocument();
  });

  test('"Use a medium locker" chooses Medium, takes the message away and keeps the flat', async () => {
    const { user } = await openForm({ before: (api) => fill(api, 'L') });
    await user.click(screen.getByText('Large'));
    await user.type(flatBox(), '302');
    await user.click(getALocker());
    await user.click(await screen.findByRole('button', { name: 'Use a medium locker' }));
    expect(size('Medium')).toBeChecked();
    expect(size('Large')).not.toBeChecked();
    expect(screen.queryByText('No free locker of that size')).not.toBeInTheDocument();
    expect(flatBox()).toHaveValue('302');
    expect(screen.getByText('Rao')).toBeInTheDocument();
  });

  test('with every locker holding, any size gets "Every locker in the wall is holding a parcel." and no buttons', async () => {
    const { user } = await openForm({
      before: async (api) => {
        await fill(api, 'S');
        await fill(api, 'M');
        await fill(api, 'L');
      },
    });
    await user.click(screen.getByText('Small'));
    await user.type(flatBox(), '302');
    await user.click(getALocker());
    const panel = await screen.findByRole('alert');
    expect(within(panel).getByText('No free locker of that size')).toBeInTheDocument();
    expect(within(panel).getByText('Every locker in the wall is holding a parcel.')).toBeInTheDocument();
    expect(within(panel).queryAllByRole('button')).toHaveLength(0);
  });

  test('when a medium locker is given, the Medium card goes from "20 free" to "19 free"', async () => {
    const { user } = await openForm();
    await user.click(screen.getByText('Medium'));
    await user.type(flatBox(), '302');
    await user.click(getALocker());
    expect(await screen.findByText(reading('Medium', 'Shoe boxes, groceries, kits', '19 free'))).toBeInTheDocument();
    expect(screen.getByText(reading('Small', 'Envelopes, books, phone boxes', '20 free'))).toBeInTheDocument();
  });

  test('before the free lockers are read the size cards show no count, then the counts fill in', async () => {
    await openApp('/courier');
    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.queryAllByText(/free$/)).toHaveLength(0);
    expect(screen.queryByText('Full')).not.toBeInTheDocument();
    expect(await screen.findByText(reading('Large', 'Monitors, cartons, luggage', '8 free'))).toBeInTheDocument();
  });
});

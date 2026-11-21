import { fireEvent, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { openApp } from './app.jsx';
import { HOUR, MINUTE, TUE_1430, clockAt, drop, jump, person, pickUp } from './given.js';
import { reading } from './look.js';

afterEach(() => vi.useRealTimers());

const notebook = () => screen.getByRole('dialog');
const bodyRows = () => screen.getAllByRole('row').filter((row) => within(row).queryAllByRole('cell').length > 0);

/** P001 for 302 in D21 since Tue 3 Nov 14:30, now 3h 20m later. */
async function oneInTheWall(path = '/caretaker/parcels') {
  clockAt(TUE_1430);
  const app = await openApp(path, {
    before: async (api) => {
      await drop(api, 'M', '302');
      jump(3 * HOUR + 20 * MINUTE);
    },
  });
  return { ...app, user: person() };
}

describe('F-10 · The parcel book', () => {
  test('with no parcel in a locker, "In the wall now" says "No parcel is waiting"', async () => {
    await openApp('/caretaker/parcels');
    expect(screen.getByRole('heading', { name: 'In the wall now' })).toBeInTheDocument();
    expect(await screen.findByText('No parcel is waiting')).toBeInTheDocument();
    expect(screen.getByText("When a courier drops one, it appears here. A collected parcel's record opens from its id.")).toBeInTheDocument();
  });

  test('two parcels in the wall make a table with a row each, in locker order, P001 reading "302 · Rao", D21, Medium and "In the wall"', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/parcels', {
      before: async (api) => {
        await drop(api, 'M', '302');
        await drop(api, 'S', '304');
        jump(3 * HOUR + 20 * MINUTE);
      },
    });
    await screen.findByRole('table');
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent).filter(Boolean);
    expect(headers).toEqual(['Parcel', 'Flat', 'Locker', 'Waiting', 'Status']);
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('P002')).toBeInTheDocument();
    const p001 = rows[1];
    expect(within(p001).getByText('P001')).toBeInTheDocument();
    expect(within(p001).getByText(reading('302 · Rao'))).toBeInTheDocument();
    expect(within(p001).getByText(reading('D21', 'Medium'))).toBeInTheDocument();
    expect(within(p001).getByText('3h 20m')).toBeInTheDocument();
    expect(within(p001).getByText('In the wall')).toBeInTheDocument();
  });

  test('a parcel still in its locker after its free window reads "Code expired" in its row', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/parcels', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(48 * HOUR + 5 * MINUTE);
      },
    });
    await screen.findByRole('table');
    const [row] = bodyRows();
    expect(within(row).getByText('Code expired')).toBeInTheDocument();
    expect(within(row).queryByText('In the wall')).not.toBeInTheDocument();
  });

  test('collected parcels show under "Collected" with their count, one box each, the most recently collected first', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/parcels', {
      before: async (api) => {
        const first = await drop(api, 'M', '302');
        const second = await drop(api, 'S', '304');
        jump(HOUR);
        await pickUp(api, first.code);
        jump(HOUR);
        await pickUp(api, second.code);
      },
    });
    const shelf = await screen.findByRole('region', { name: /^Collected/ });
    expect(within(shelf).getByText(reading('Collected', '2'))).toBeInTheDocument();
    const boxes = within(shelf).getAllByRole('button');
    expect(boxes).toHaveLength(2);
    expect(boxes[0]).toHaveAccessibleName('P002, collected by flat 304. Open its notebook');
    expect(boxes[1]).toHaveAccessibleName('P001, collected by flat 302. Open its notebook');
    expect(within(boxes[0]).getByText('P002')).toBeInTheDocument();
  });

  test('clicking anywhere on a row opens that parcel\'s notebook over the page', async () => {
    const { user } = await oneInTheWall();
    await screen.findByRole('table');
    await user.click(within(bodyRows()[0]).getByText('In the wall'));
    expect(within(notebook()).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'In the wall now' })).toBeInTheDocument();
  });

  test('a row\'s arrow, "Open P001\'s notebook", opens its notebook', async () => {
    const { user } = await oneInTheWall();
    await user.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    expect(within(notebook()).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
  });

  test('a box on the Collected shelf opens its notebook', async () => {
    await openApp('/caretaker/parcels', {
      before: async (api) => {
        const { code } = await drop(api, 'M', '302');
        await pickUp(api, code);
      },
    });
    await person().click(await screen.findByRole('button', { name: 'P001, collected by flat 302. Open its notebook' }));
    expect(within(notebook()).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
  });

  test('typing P001 in "Open a parcel, e.g. P001" and pressing Open opens its notebook', async () => {
    const { user } = await oneInTheWall();
    await user.type(screen.getByPlaceholderText('Open a parcel, e.g. P001'), 'P001');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(within(notebook()).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
  });

  test('typing just 1 and pressing Enter opens P001\'s notebook', async () => {
    const { user } = await oneInTheWall();
    await user.type(screen.getByPlaceholderText('Open a parcel, e.g. P001'), '1{Enter}');
    expect(within(notebook()).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
    expect(await within(notebook()).findByText('In the wall')).toBeInTheDocument();
  });

  test('the notebook of P001, still in D21, shows its stamp, four facts and the two lines that can\'t be edited', async () => {
    const { user } = await oneInTheWall();
    await user.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    const book = notebook();
    expect(within(book).getByText('Parcel notebook · Tower A')).toBeInTheDocument();
    expect(within(book).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
    expect(await within(book).findByText('In the wall')).toBeInTheDocument();
    expect(within(book).getByText(reading('Locker', 'D21', 'Medium'))).toBeInTheDocument();
    expect(within(book).getByText(reading('For', 'Flat 302', 'Rao family'))).toBeInTheDocument();
    expect(within(book).getByText(reading('Dropped', 'Tue 3 Nov', 'at 14:30'))).toBeInTheDocument();
    expect(within(book).getByText(reading('Code', 'Valid until', 'Thu 5 Nov, 14:30'))).toBeInTheDocument();
    expect(within(book).getByText('What happened')).toBeInTheDocument();
    expect(within(book).getByText(reading('Can’t be edited'))).toBeInTheDocument();
    expect(within(book).getByText(reading('Dropped into locker D21', 'Tue 3 Nov, 14:30'))).toBeInTheDocument();
    expect(within(book).getByText(reading('Code issued for 48 hours', 'Tue 3 Nov, 14:30', '· valid until Thu 5 Nov, 14:30'))).toBeInTheDocument();
    expect(within(book).getAllByRole('listitem')).toHaveLength(2);
  });

  test('the notebook of a collected P001 is stamped "Collected", its code "Used", with a third line "Collected from locker D21"', async () => {
    clockAt(TUE_1430);
    await openApp('/caretaker/parcels', {
      before: async (api) => {
        const { code } = await drop(api, 'M', '302');
        jump(3 * HOUR + 20 * MINUTE);
        await pickUp(api, code);
      },
    });
    await person().click(await screen.findByRole('button', { name: 'P001, collected by flat 302. Open its notebook' }));
    const book = notebook();
    expect(await within(book).findByText('Collected')).toBeInTheDocument();
    expect(within(book).getByText(reading('Code', 'Used', 'Tue 3 Nov, 17:50'))).toBeInTheDocument();
    expect(within(book).getByText(reading('Collected from locker D21', 'Tue 3 Nov, 17:50', '· waited 3h 20m'))).toBeInTheDocument();
    expect(within(book).getAllByRole('listitem')).toHaveLength(3);
  });

  test('a parcel collected straight away says "waited under a minute" in its third line', async () => {
    await openApp('/caretaker/parcels', {
      before: async (api) => {
        const { code } = await drop(api, 'M', '302');
        await pickUp(api, code);
      },
    });
    await person().click(await screen.findByRole('button', { name: 'P001, collected by flat 302. Open its notebook' }));
    expect(await within(notebook()).findByText(reading('Collected from locker D21', /· waited under a minute$/))).toBeInTheDocument();
  });

  test('the notebook of a parcel past its free window is stamped "Code expired", its code "Expired" with when', async () => {
    clockAt(TUE_1430);
    const { user } = await openApp('/caretaker/parcels', {
      before: async (api) => {
        await drop(api, 'M', '302');
        jump(48 * HOUR + 5 * MINUTE);
      },
    }).then((app) => ({ ...app, user: person() }));
    await user.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    const book = notebook();
    expect(await within(book).findByText('Code expired')).toBeInTheDocument();
    expect(within(book).getByText(reading('Code', 'Expired', 'Thu 5 Nov, 14:30'))).toBeInTheDocument();
  });

  test('opening P999, which does not exist, says "No page for “P999” in this notebook." and "No such parcel"', async () => {
    const user = person();
    await openApp('/caretaker/parcels');
    await user.type(screen.getByPlaceholderText('Open a parcel, e.g. P001'), 'P999{Enter}');
    const book = notebook();
    expect(await within(book).findByText('No page for “P999” in this notebook.')).toBeInTheDocument();
    expect(within(book).getByText('No such parcel')).toBeInTheDocument();
    expect(within(book).getByText('There is no parcel P999.')).toBeInTheDocument();
    expect(within(book).getByText(reading('Parcel ids look like P001. A refused drop never gets a page, because nothing happened to a parcel.'))).toBeInTheDocument();
  });

  test('the foot of a notebook explains "How this notebook works"', async () => {
    const { user } = await oneInTheWall();
    await user.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    const book = notebook();
    expect(within(book).getByText(reading('How this notebook works'))).toBeInTheDocument();
    expect(within(book).getByText('Every change to a parcel adds a line here, written together with the change itself. A refused drop leaves no line. Lines are only ever added: nothing is rewritten or removed.')).toBeInTheDocument();
    expect(within(book).getByText('It opens over the page you are on. Close it with ×, Esc or a click outside and you are right where you were.')).toBeInTheDocument();
  });

  test('a notebook offers no way to change or remove a line', async () => {
    const { user } = await oneInTheWall();
    await user.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    const book = notebook();
    await within(book).findByText('What happened');
    expect(within(book).queryAllByRole('textbox')).toHaveLength(0);
    expect(within(book).getAllByRole('button').map((b) => b.getAttribute('aria-label') || b.textContent)).toEqual(['Close the notebook']);
  });

  test('× (Close the notebook) closes it and leaves the page and the address as they were', async () => {
    const { user, address } = await oneInTheWall();
    await user.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    expect(address()).toBe('/caretaker/parcels');
    await user.click(within(notebook()).getByRole('button', { name: 'Close the notebook' }));
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(address()).toBe('/caretaker/parcels');
    expect(screen.getByRole('heading', { name: 'In the wall now' })).toBeInTheDocument();
  });

  test('Esc closes the notebook and the address never changed', async () => {
    const { user, address } = await oneInTheWall();
    await user.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    await waitFor(() => expect(within(notebook()).getByRole('button', { name: 'Close the notebook' })).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(address()).toBe('/caretaker/parcels');
    await waitFor(() => expect(screen.getByRole('button', { name: "Open P001's notebook" })).toHaveFocus());
  });

  test('a notebook whose record is not read yet already shows the id asked for and the note on how it works', async () => {
    await oneInTheWall();
    // A plain click, looked at in the same moment: the record's answer has not arrived yet.
    fireEvent.click(await screen.findByRole('button', { name: "Open P001's notebook" }));
    const book = notebook();
    expect(within(book).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
    expect(within(book).getByText(reading('How this notebook works'))).toBeInTheDocument();
    expect(within(book).queryByText('What happened')).not.toBeInTheDocument();
    expect(await within(book).findByText('What happened')).toBeInTheDocument();
    expect(within(book).getByText(reading('Dropped into locker D21', /14:30/))).toBeInTheDocument();
  });

  test('on the wall, "Open the parcel\'s notebook" in D21\'s drawer opens P001\'s notebook over the wall', async () => {
    const { user, address } = await oneInTheWall('/caretaker/wall');
    await user.click(await screen.findByRole('button', { name: 'Locker D21, holding a parcel' }));
    await user.click(await screen.findByRole('button', { name: "Open the parcel's notebook" }));
    const book = notebook();
    expect(within(book).getByRole('heading', { name: 'P001' })).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: "Open the parcel's notebook" })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    expect(address()).toBe('/caretaker/wall');
  });
});

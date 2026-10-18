/**
 * The 9x9 board.
 *
 * Cells are created once; every render only writes the attributes that
 * actually changed, so re-renders stay cheap.
 */
import { CELL_COUNT, colOf, maskDigits, rowOf, sharesUnit } from '../core/board.ts';
import { SIZE } from '../core/board.ts';
import type { Cell } from '../core/types.ts';
import type { App } from '../state/app.ts';
import { el, setAttr, setText, toggleClass } from './dom.ts';

interface CellView {
  root: HTMLDivElement;
  value: HTMLSpanElement;
  noteSpans: HTMLSpanElement[];
  lastClass: string;
  lastValue: number;
  lastNotes: number;
  lastLabel: string;
  lastTabIndex: string;
  lastSelected: string;
}

export class BoardView {
  readonly root: HTMLDivElement;
  private readonly cells: CellView[] = [];

  constructor(
    private readonly app: App,
    container: HTMLElement,
  ) {
    this.root = el('div', {
      class: 'board',
      attrs: {
        role: 'grid',
        'aria-label': app.t('board.label'),
        'aria-rowcount': SIZE,
        'aria-colcount': SIZE,
        tabindex: '-1',
      },
    });

    for (let row = 0; row < SIZE; row++) {
      const rowNode = el('div', { class: 'board__row', attrs: { role: 'row' } });
      for (let col = 0; col < SIZE; col++) {
        const index = row * SIZE + col;
        const value = el('span', { class: 'cell__value', attrs: { 'aria-hidden': 'true' } });
        const notes = el('span', { class: 'cell__notes', attrs: { 'aria-hidden': 'true' } });
        const noteSpans: HTMLSpanElement[] = [];
        for (let digit = 1; digit <= SIZE; digit++) {
          const note = el('span', {
            class: 'cell__note',
            text: String(digit),
            attrs: { 'aria-hidden': 'true' },
          });
          noteSpans.push(note);
          notes.appendChild(note);
        }
        const cell = el(
          'div',
          {
            class: 'cell',
            dataset: { index },
            attrs: { role: 'gridcell', tabindex: '-1' },
          },
          [value, notes],
        );
        rowNode.appendChild(cell);
        this.cells.push({
          root: cell,
          value,
          noteSpans,
          lastClass: '',
          lastValue: -1,
          lastNotes: -1,
          lastLabel: '',
          lastTabIndex: '',
          lastSelected: '',
        });
      }
      this.root.appendChild(rowNode);
    }

    this.root.addEventListener('click', (event) => this.handleClick(event));
    container.appendChild(this.root);
  }

  /** Re-renders the whole board. */
  render(): void {
    const game = this.app.game;
    const settings = this.app.settings;
    if (!game) {
      toggleClass(this.root, 'is-loading', true);
      return;
    }
    toggleClass(this.root, 'is-loading', false);

    const selectedIndex = game.selected;
    const selectedValue = selectedIndex >= 0 ? game.cells[selectedIndex].value : 0;
    const highlightSame = settings.highlightSameNumber && selectedValue !== 0;

    for (let index = 0; index < CELL_COUNT; index++) {
      const view = this.cells[index];
      const cell = game.cells[index];
      const selected = selectedIndex === index;
      const classes = ['cell'];
      if (cell.given) classes.push('is-given');
      else if (game.isLocked(index)) classes.push('is-locked');
      if (selected) classes.push('is-selected');
      if (cell.value === 0) classes.push('is-blank');
      if (cell.value === 0 && cell.notes !== 0) classes.push('has-notes');
      if (
        settings.highlightPeers &&
        !selected &&
        selectedIndex >= 0 &&
        sharesUnit(index, selectedIndex)
      ) {
        classes.push('is-peer');
      }
      if (highlightSame && cell.value === selectedValue && !selected) classes.push('is-same');

      // Rot = the mistake to delete. The other half of a duplicate - a correct
      // cell or a given clue - is only the *reason*: a quiet, neutral mark that
      // can never be mistaken for an error (never red, never amber).
      const wrong = game.isWrong(index);
      if (wrong) classes.push('is-wrong');
      else if (game.isConflict(index)) classes.push('is-duplicate');

      const className = classes.join(' ');
      if (className !== view.lastClass) {
        view.root.className = className;
        view.lastClass = className;
      }

      if (cell.value !== view.lastValue) {
        setText(view.value, cell.value === 0 ? '' : String(cell.value));
        view.lastValue = cell.value;
      }

      if (cell.notes !== view.lastNotes) {
        for (let digit = 1; digit <= SIZE; digit++) {
          toggleClass(view.noteSpans[digit - 1], 'is-visible', (cell.notes & (1 << digit)) !== 0);
        }
        view.lastNotes = cell.notes;
      }

      const label = this.cellLabel(index, cell, selected, wrong);
      if (label !== view.lastLabel) {
        setAttr(view.root, 'aria-label', label);
        view.lastLabel = label;
      }
      const selectedAttr = selected ? 'true' : 'false';
      if (selectedAttr !== view.lastSelected) {
        setAttr(view.root, 'aria-selected', selectedAttr);
        view.lastSelected = selectedAttr;
      }
      const tabIndex = selected || (selectedIndex < 0 && index === 0) ? '0' : '-1';
      if (tabIndex !== view.lastTabIndex) {
        setAttr(view.root, 'tabindex', tabIndex);
        view.lastTabIndex = tabIndex;
      }
      if (wrong) setAttr(view.root, 'aria-invalid', 'true');
      else setAttr(view.root, 'aria-invalid', null);
    }

    toggleClass(this.root, 'is-won', game.status === 'won');
  }

  focusSelected(): void {
    const game = this.app.game;
    if (!game || game.selected < 0) return;
    const view = this.cells[game.selected];
    view.root.focus({ preventScroll: true });
  }

  private handleClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    const cell = target?.closest<HTMLElement>('[data-index]');
    if (!cell) return;
    const index = Number(cell.dataset.index);
    if (!Number.isInteger(index)) return;
    this.app.selectCell(index);
    this.focusSelected();
  }

  private cellLabel(index: number, cell: Cell, selected: boolean, wrong: boolean): string {
    const t = this.app.t.bind(this.app);
    const params = { row: rowOf(index) + 1, col: colOf(index) + 1 };
    let label: string;
    if (cell.value !== 0) {
      label = cell.given
        ? t('board.cellGiven', { ...params, value: cell.value })
        : t('board.cellFilled', { ...params, value: cell.value });
      if (wrong) label = `${label} - ${t('board.cellWrong', { ...params, value: cell.value })}`;
    } else if (cell.notes !== 0) {
      label = t('board.cellNotes', { ...params, notes: maskDigits(cell.notes).join(' ') });
    } else {
      label = t('board.cellEmpty', params);
    }
    return selected ? `${label}, ${t('board.cellSelected')}` : label;
  }
}

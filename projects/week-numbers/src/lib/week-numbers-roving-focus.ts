import { FocusKeyManager, type FocusableOption } from '@angular/cdk/a11y';
import { Directionality } from '@angular/cdk/bidi';
import {
  computed,
  contentChildren,
  Directive,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
} from '@angular/core';

/**
 * Internal (not exported by the public API): one tab stop for a row of buttons, like the grid of
 * the calendar (WAI-ARIA toolbar pattern, "roving tabindex" technique: a single button has
 * `tabindex="0"`, the others `-1`, and the `0` moves with the focus).
 *
 * Goal: Tab reaches a single button, the arrow keys move between the buttons. Without it, every
 * button is a tab stop. `FocusKeyManager` (CDK) handles the keys: arrows (reversed in
 * right-to-left layouts), Home / End, no wrapping, disabled buttons skipped.
 *
 * ```html
 * <div [dcRovingFocus]="defaultTabStop" aria-label="…">
 *   <button dcRovingFocusItem>…</button>
 * </div>
 * ```
 */
@Directive({
  selector: '[dcRovingFocus]',
  host: {
    role: 'toolbar',
    '(keydown)': 'onKeydown($event)',
  },
})
export class DcRovingFocus {
  /** Index of the default tab stop (`-1`: none), applied again whenever it changes. */
  readonly defaultTabStop = input.required<number>({ alias: 'dcRovingFocus' });

  readonly items = contentChildren(DcRovingFocusItem, { descendants: true });

  /** Index of the only button with `tabindex="0"`: the default one, then the focused one. */
  readonly tabStop = linkedSignal(() => this.defaultTabStop());

  private readonly dir = inject(Directionality);

  private readonly keyManager = new FocusKeyManager(this.items, inject(Injector)).withHomeAndEnd();

  protected onKeydown(event: KeyboardEvent): void {
    // Start from the focused button: Tab, a click or the arrow keys may have moved the focus.
    const index = this.items().findIndex((item) => item.element === event.target);
    if (index < 0) return;
    this.keyManager.withHorizontalOrientation(this.dir.value);
    this.keyManager.updateActiveItem(index);
    this.keyManager.onKeydown(event);
  }
}

/** A button of `dcRovingFocus`: owns its `tabindex`, and becomes the tab stop when focused. */
@Directive({
  selector: 'button[dcRovingFocusItem]',
  host: {
    '[tabIndex]': 'index() === roving.tabStop() ? 0 : -1',
    '(focus)': 'roving.tabStop.set(index())',
  },
})
export class DcRovingFocusItem implements FocusableOption {
  readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef).nativeElement;

  protected readonly roving = inject(DcRovingFocus);

  protected readonly index = computed(() => this.roving.items().indexOf(this));

  /** Read from the button: skipped by the arrow keys when disabled. */
  get disabled(): boolean {
    return this.element.disabled;
  }

  focus(): void {
    this.element.focus();
  }
}

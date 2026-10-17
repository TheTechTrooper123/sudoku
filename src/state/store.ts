/**
 * Minimal reactive store: one state object, explicit notifications.
 *
 * The app is small enough that a full framework would be overkill - renderers
 * subscribe to the events they care about and update just their own DOM.
 */
export type Listener<T> = (state: T) => void;

export class Store<T extends object> {
  private readonly listeners = new Set<Listener<T>>();

  constructor(private value: T) {}

  get state(): T {
    return this.value;
  }

  patch(partial: Partial<T>): void {
    this.value = { ...this.value, ...partial };
    this.notify();
  }

  update(mutator: (state: T) => void): void {
    mutator(this.value);
    this.notify();
  }

  set(state: T): void {
    this.value = state;
    this.notify();
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    for (const listener of this.listeners) listener(this.value);
  }
}

/** Tiny typed event emitter used for UI signals. */
export class Emitter<E extends string> {
  private readonly listeners = new Map<E, Set<() => void>>();

  on(event: E, listener: () => void): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  emit(event: E): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) listener();
  }
}

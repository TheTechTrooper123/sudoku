/**
 * Minimal event plumbing: the app is small enough that a full framework would
 * be overkill - renderers subscribe to the events they care about and update
 * just their own DOM.
 */
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

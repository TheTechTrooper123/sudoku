/**
 * Small DOM helpers. The app renders a handful of dynamic regions and updates
 * them in place, so a tiny `el()` factory keeps the view code readable without
 * pulling in a framework.
 */
export type Child = Node | string | null | undefined | false;

export interface ElementOptions {
  class?: string;
  text?: string;
  attrs?: Record<string, string | number | boolean | null | undefined>;
  dataset?: Record<string, string | number | undefined>;
  on?: Partial<Record<keyof HTMLElementEventMap, (event: Event) => void>>;
  style?: Partial<CSSStyleDeclaration>;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.class) node.className = options.class;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) {
    for (const [name, value] of Object.entries(options.attrs)) {
      if (value === null || value === undefined || value === false) continue;
      node.setAttribute(name, value === true ? '' : String(value));
    }
  }
  if (options.dataset) {
    for (const [name, value] of Object.entries(options.dataset)) {
      if (value === undefined) continue;
      node.dataset[name] = String(value);
    }
  }
  if (options.on) {
    for (const [event, handler] of Object.entries(options.on)) {
      if (!handler) continue;
      node.addEventListener(event, handler as EventListener);
    }
  }
  if (options.style) Object.assign(node.style, options.style);
  append(node, children);
  return node;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const node = root.querySelector<T>(selector);
  if (!node) throw new Error(`missing element: ${selector}`);
  return node;
}

export function qsAll<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

/** Sets text content only when it actually changed (avoids re-layout). */
export function setText(node: Element, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

export function toggleClass(node: Element, name: string, active: boolean): void {
  if (node.classList.contains(name) === active) return;
  node.classList.toggle(name, active);
}

export function setAttr(node: Element, name: string, value: string | null): void {
  if (value === null) {
    if (node.hasAttribute(name)) node.removeAttribute(name);
    else return;
    return;
  }
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
}

export function multiply(text: string, times: number): string {
  return times > 0 ? text.repeat(times) : '';
}

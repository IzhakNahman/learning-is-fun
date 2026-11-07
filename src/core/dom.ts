/** Small DOM helpers. Content is always inserted as text, never as HTML. */

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export interface ElementOptions {
  className?: string;
  text?: string;
  id?: string;
  title?: string;
  dataset?: Record<string, string>;
  onClick?: () => void;
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  if (options.className) element.className = options.className;
  if (options.id) element.id = options.id;
  if (options.title) element.title = options.title;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.dataset) Object.assign(element.dataset, options.dataset);
  if (options.onClick) element.addEventListener('click', options.onClick);
  element.append(...children);
  return element;
}

export function clearChildren(node: Node): void {
  node.textContent = '';
}

export function show(element: HTMLElement, display = 'flex'): void {
  element.style.display = display;
}

export function hide(element: HTMLElement): void {
  element.style.display = 'none';
}

export const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

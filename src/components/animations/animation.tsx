export function resetFx(el: HTMLElement, className: string) {
  el.classList.remove(className);
  // Force reflow
  void el.offsetWidth;
  el.classList.add(className);
}

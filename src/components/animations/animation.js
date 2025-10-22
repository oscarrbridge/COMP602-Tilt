export function resetFx(el, className) {
    el.classList.remove(className);
    // Force reflow
    void el.offsetWidth;
    el.classList.add(className);
}

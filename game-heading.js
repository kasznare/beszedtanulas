// Games share one visible title in the app bar, including their nested views.
export function setGameTitle(root, title) {
  root.dataset.viewTitle = title;
  if (root.classList.contains('is-active')) document.querySelector('#screen-title').textContent = title;
}

export function focusGameTitle(root) {
  if (!root.classList.contains('is-active')) return;
  const heading = document.querySelector('#screen-title');
  if (root.dataset.viewTitle) heading.textContent = root.dataset.viewTitle;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
}

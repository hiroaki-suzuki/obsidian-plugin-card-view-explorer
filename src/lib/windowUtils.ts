export function reloadPage(target: Pick<Location, "reload"> = window.location): void {
  target.reload();
}

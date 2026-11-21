// What the screen does after a server action returns. Shared by the form and button components.

export function navigateAfterAction(response, router) {
  if (!response) {
    return;
  }

  if (response.code === "unauthenticated") {
    router.push("/shop/login");
    return;
  }

  if (response.ok && response.redirectTo) {
    router.push(response.redirectTo);
    return;
  }

  if (response.ok) {
    router.refresh();
  }
}

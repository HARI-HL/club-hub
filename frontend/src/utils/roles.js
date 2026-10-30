// One place that decides which links a person sees. The backend still enforces every rule.
export function linksFor(user) {
  if (!user) return [];
  const links = [{ to: "/account", label: "Account" }];
  if (user.role === "club_admin" || user.role === "site_admin") links.push({ to: "/admin/club", label: "Club admin" });
  if (user.role === "site_admin") links.push({ to: "/admin/site", label: "Site admin" });
  return links;
}

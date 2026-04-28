/*
 * Auth pages skip the AppShell — the sidebar / topbar / cmd-k chrome
 * isn't relevant when you're not signed in.
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import { DashboardNotificationProvider } from '@/components/dashboard/dashboard-notifications';

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <DashboardNotificationProvider>{children}</DashboardNotificationProvider>
  );
}

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

export function AppLayout({ children, onLogout }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>
        <AppSidebar onLogout={onLogout} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 glass sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

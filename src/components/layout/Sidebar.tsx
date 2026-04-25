import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar as SidebarUI,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Workflow,
  History,
  Settings,
  ShieldCheck,
  Zap,
  LogOut,
} from "lucide-react";

const mainItems = [
  { title: "Dashboard",   url: "/dashboard",   icon: LayoutDashboard },
  { title: "Partes",      url: "/partes",      icon: FileText },
  { title: "Revisión",    url: "/revision",    icon: ClipboardCheck },
  { title: "Cola SIEC",   url: "/cola",        icon: Workflow },
  { title: "Historial",   url: "/historial",   icon: History },
];

const adminItems = [
  { title: "Administración", url: "/admin", icon: Settings },
];

export function Sidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const renderItem = (item: { title: string; url: string; icon: typeof LayoutDashboard; badge?: string }) => {
    const active = location.pathname.startsWith(item.url);
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild className="h-10">
          <NavLink
            to={item.url}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary" />
            )}
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.title}</span>
                {item.badge && (
                  <span className="rounded-full bg-sidebar-primary/20 px-2 py-0.5 text-[10px] font-semibold text-sidebar-primary">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <SidebarUI collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-accent shadow-glow">
            <Zap className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-display text-base font-bold text-sidebar-foreground">SIEC Bridge LCC</span>
              <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">Control Center</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Administración
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">{adminItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-sidebar-accent/40 p-3">
              <div className="flex items-center gap-2 text-sidebar-foreground">
                <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
                <span className="text-xs font-semibold">SIEC conectado</span>
              </div>
              <p className="mt-1 text-[11px] text-sidebar-foreground/60">
                API operativa · v2.4.1
              </p>
            </div>
            <button 
              onClick={() => signOut()}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <ShieldCheck className="h-4 w-4 text-sidebar-primary" />
            <button onClick={() => signOut()} title="Cerrar sesión">
              <LogOut className="h-4 w-4 text-destructive" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </SidebarUI>
  );
}

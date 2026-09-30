import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Truck, Package, Boxes, CreditCard, Users, FileBarChart, UserCog, Settings,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { t } = useI18n();
  const { role } = useAuth();
  const isDirecteur = role === "directeur";
  const path = useRouterState({ select: (r) => r.location.pathname });

  const allItems = [
    { to: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard, directeurOnly: false },
    { to: "/deliveries", label: t("nav.deliveries"), icon: Truck, directeurOnly: false },
    { to: "/products", label: t("nav.products"), icon: Package, directeurOnly: false },
    { to: "/order-room", label: t("nav.orderRoom"), icon: Boxes, directeurOnly: false },
    { to: "/cashier", label: t("nav.cashier"), icon: CreditCard, directeurOnly: false },
    { to: "/clients", label: t("nav.clients"), icon: Users, directeurOnly: false },
    { to: "/reports", label: t("nav.reports"), icon: FileBarChart, directeurOnly: true },
    { to: "/users", label: t("nav.users"), icon: UserCog, directeurOnly: true },
    { to: "/settings", label: t("nav.settings"), icon: Settings, directeurOnly: false },
  ];
  const items = allItems.filter((i) => isDirecteur || !i.directeurOnly);

  const isActive = (p: string) => path === p || path.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary shadow-glow flex items-center justify-center text-primary-foreground font-bold">
            D
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sidebar-foreground">DeliverPro</span>
              <span className="text-xs text-sidebar-foreground/60">Gestion logistique</span>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Modules</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((it) => {
                const active = isActive(it.to);
                return (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={it.to} className="flex items-center gap-3">
                        <it.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{it.label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

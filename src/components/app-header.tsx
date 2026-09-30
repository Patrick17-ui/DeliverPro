import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { LogOut, Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const { lang, setLang, t } = useI18n();
  const { user, role, signOut } = useAuth();

  return (
    <header className="h-16 flex items-center justify-between border-b bg-card/60 backdrop-blur px-4 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <Globe className="h-4 w-4" /> {lang.toUpperCase()}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLang("fr")}>Français</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLang("en")}>English</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden sm:flex flex-col text-right leading-tight px-2">
          <span className="text-sm font-medium">{user?.email}</span>
          {role && (
            <span className="text-xs text-muted-foreground capitalize">{role}</span>
          )}
        </div>

        <Button variant="ghost" size="icon" onClick={signOut} title={t("nav.logout")}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}

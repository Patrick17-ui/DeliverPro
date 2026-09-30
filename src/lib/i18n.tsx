import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "fr" | "en";

const dict: Record<Lang, Record<string, string>> = {
  fr: {
    "app.name": "DeliverPro",
    "auth.title": "Bienvenue",
    "auth.subtitle": "Connectez-vous pour gérer vos livraisons",
    "auth.email": "Adresse email",
    "auth.password": "Mot de passe",
    "auth.login": "Se connecter",
    "auth.signup": "Créer un compte",
    "auth.toggle.toSignup": "Pas de compte ? Créer un compte",
    "auth.toggle.toLogin": "Déjà un compte ? Se connecter",
    "auth.fullName": "Nom complet",
    "nav.dashboard": "Tableau de bord",
    "nav.deliveries": "Livraisons",
    "nav.products": "Produits",
    "nav.orderRoom": "Salle de commande",
    "nav.cashier": "Caisse",
    "nav.clients": "Clients",
    "nav.reports": "Rapports",
    "nav.users": "Utilisateurs",
    "nav.settings": "Paramètres",
    "nav.logout": "Se déconnecter",
    "kpi.revenue": "Chiffre d'affaires",
    "kpi.deliveries": "Livraisons",
    "kpi.clients": "Clients",
    "kpi.products": "Produits",
    "dash.charts": "Statistiques",
    "dash.revenue": "Revenus",
    "dash.free": "Gratuités",
    "dash.returns": "Retours",
    "dash.topProducts": "Meilleurs produits",
    "dash.topClients": "Clients de premier plan",
    "dash.topZones": "Zones de livraison top",
    "dash.allDrivers": "Tous les livreurs",
    "common.search": "Rechercher",
    "common.filter": "Filtrer",
    "common.add": "Ajouter",
    "common.import": "Importer",
    "common.export": "Exporter",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.continue": "Continuer",
    "common.edit": "Modifier",
    "common.delete": "Supprimer",
    "common.back": "Retour",
    "common.loading": "Chargement…",
    "common.empty": "Aucun élément",
    "common.actions": "Actions",
  },
  en: {
    "app.name": "DeliverPro",
    "auth.title": "Welcome",
    "auth.subtitle": "Sign in to manage your deliveries",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.login": "Sign in",
    "auth.signup": "Create account",
    "auth.toggle.toSignup": "No account? Create one",
    "auth.toggle.toLogin": "Already have an account? Sign in",
    "auth.fullName": "Full name",
    "nav.dashboard": "Dashboard",
    "nav.deliveries": "Deliveries",
    "nav.products": "Products",
    "nav.orderRoom": "Order room",
    "nav.cashier": "Cashier",
    "nav.clients": "Clients",
    "nav.reports": "Reports",
    "nav.users": "Users",
    "nav.settings": "Settings",
    "nav.logout": "Sign out",
    "kpi.revenue": "Total revenue",
    "kpi.deliveries": "Deliveries",
    "kpi.clients": "Clients",
    "kpi.products": "Products",
    "dash.charts": "Statistics",
    "dash.revenue": "Revenue",
    "dash.free": "Free items",
    "dash.returns": "Returns",
    "dash.topProducts": "Top products",
    "dash.topClients": "Top clients",
    "dash.topZones": "Top delivery zones",
    "dash.allDrivers": "All drivers",
    "common.search": "Search",
    "common.filter": "Filter",
    "common.add": "Add",
    "common.import": "Import",
    "common.export": "Export",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.continue": "Continue",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.back": "Back",
    "common.loading": "Loading…",
    "common.empty": "No items",
    "common.actions": "Actions",
  },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved === "fr" || saved === "en") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: string) => dict[lang][k] ?? k;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function formatCFA(n: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}

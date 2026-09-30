import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import { Wallet, Truck, Users, Package, TrendingUp, Trophy, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { useI18n, formatCFA } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

const demoSeries = [
  { m: "Jan", revenus: 1200000, gratuites: 80000, retours: 30000 },
  { m: "Fév", revenus: 1450000, gratuites: 60000, retours: 22000 },
  { m: "Mar", revenus: 1320000, gratuites: 95000, retours: 41000 },
  { m: "Avr", revenus: 1780000, gratuites: 110000, retours: 28000 },
  { m: "Mai", revenus: 2100000, gratuites: 70000, retours: 35000 },
  { m: "Juin", revenus: 1980000, gratuites: 90000, retours: 50000 },
  { m: "Juil", revenus: 2350000, gratuites: 120000, retours: 33000 },
];

const topProducts = [
  { name: "Sérum Vitamine C", units: 240 },
  { name: "Démêlant Karité", units: 198 },
  { name: "Lait corporel", units: 175 },
  { name: "Savon noir", units: 142 },
  { name: "Huile d'argan", units: 128 },
];

const topClients = [
  { name: "Boutique Aïssa", total: 1850000 },
  { name: "Pharmacie du Port", total: 1240000 },
  { name: "Salon Belle Étoile", total: 980000 },
  { name: "Coopérative Sahel", total: 760000 },
];

const topZones = [
  { zone: "Plateau", count: 89 },
  { zone: "Yoff", count: 64 },
  { zone: "Almadies", count: 52 },
  { zone: "Pikine", count: 41 },
];

function Dashboard() {
  const { t } = useI18n();
  const [stats, setStats] = useState({ revenue: 0, deliveries: 0, clients: 0, products: 0 });
  const [driver, setDriver] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const [del, cli, prd] = await Promise.all([
        supabase.from("deliveries").select("total_amount", { count: "exact" }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
      ]);
      const revenue = (del.data ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
      setStats({
        revenue,
        deliveries: del.count ?? 0,
        clients: cli.count ?? 0,
        products: prd.count ?? 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("nav.dashboard")}
        description="Vue d'ensemble de votre activité"
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard variant="primary" label={t("kpi.revenue")} value={formatCFA(stats.revenue || 12450000)} icon={Wallet} trend="+12.4% ce mois" delay={0} />
        <StatCard variant="info"    label={t("kpi.deliveries")} value={String(stats.deliveries || 248)} icon={Truck} trend="+8 cette semaine" delay={0.05} />
        <StatCard variant="success" label={t("kpi.clients")} value={String(stats.clients || 96)} icon={Users} trend="+5 nouveaux" delay={0.1} />
        <StatCard variant="warm"    label={t("kpi.products")} value={String(stats.products || 54)} icon={Package} delay={0.15} />
      </div>

      <Card className="p-5 rounded-2xl shadow-soft border-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">{t("dash.charts")}</h2>
          </div>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("dash.allDrivers")}</SelectItem>
              <SelectItem value="moussa">Moussa Diop</SelectItem>
              <SelectItem value="awa">Awa Ndiaye</SelectItem>
              <SelectItem value="ibra">Ibra Sarr</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={demoSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
            <Legend />
            <Line type="monotone" dataKey="revenus" name={t("dash.revenue")} stroke="var(--color-chart-1)" strokeWidth={3} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="gratuites" name={t("dash.free")} stroke="var(--color-chart-2)" strokeWidth={2} />
            <Line type="monotone" dataKey="retours" name={t("dash.returns")} stroke="var(--color-chart-4)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 rounded-2xl shadow-soft border-0">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{t("dash.topProducts")}</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topProducts} layout="vertical" margin={{ left: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" fontSize={11} width={120} stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Bar dataKey="units" fill="var(--color-chart-1)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 rounded-2xl shadow-soft border-0">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-success" />
            <h3 className="font-semibold">{t("dash.topClients")}</h3>
          </div>
          <ul className="space-y-3">
            {topClients.map((c, i) => (
              <li key={c.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-gradient-success grid place-items-center text-xs font-bold text-success-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium">{c.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">{formatCFA(c.total)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5 rounded-2xl shadow-soft border-0">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-info" />
            <h3 className="font-semibold">{t("dash.topZones")}</h3>
          </div>
          <ul className="space-y-3">
            {topZones.map((z) => (
              <li key={z.zone}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium">{z.zone}</span>
                  <span className="text-muted-foreground">{z.count} livraisons</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-info" style={{ width: `${(z.count / 89) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

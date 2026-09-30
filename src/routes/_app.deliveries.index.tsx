import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Truck, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { useI18n, formatCFA } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { exportCSV } from "@/lib/export-csv";

export const Route = createFileRoute("/_app/deliveries/")({
  component: DeliveriesPage,
});

type DeliveryRow = {
  id: string;
  reference: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total_amount: number;
  created_at: string;
  driver_id: string | null;
  zone: string | null;
  clients: { full_name: string | null } | null;
};
type Driver = { id: string; full_name: string | null };

function statusBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    en_cours: { label: "En cours", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
    livree: { label: "Livrée", cls: "bg-success/15 text-success border-success/30" },
    annulee: { label: "Annulée", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    retournee: { label: "Retournée", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[s] ?? { label: s, cls: "bg-muted" };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}
function paymentBadge(s: string) {
  const map: Record<string, { label: string; cls: string }> = {
    paye: { label: "Payé", cls: "bg-success/15 text-success border-success/30" },
    avance: { label: "Avancé", cls: "bg-info/15 text-info border-info/30" },
    non_paye: { label: "Non payé", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const v = map[s] ?? { label: s, cls: "bg-muted" };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

function DeliveriesPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pay, setPay] = useState("all");
  const [driver, setDriver] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data }, { data: livreurs }] = await Promise.all([
      supabase
        .from("deliveries")
        .select("id, reference, status, payment_status, payment_method, total_amount, created_at, driver_id, zone, clients(full_name)")
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setRows((data as unknown as DeliveryRow[]) ?? []);
    setDrivers((livreurs as Driver[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const driverName = (id: string | null) => drivers.find((d) => d.id === id)?.full_name ?? "—";

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    if (q && !r.reference.toLowerCase().includes(q) && !(r.clients?.full_name ?? "").toLowerCase().includes(q)) return false;
    if (status !== "all" && r.status !== status) return false;
    if (pay !== "all" && r.payment_status !== pay) return false;
    if (driver !== "all" && r.driver_id !== driver) return false;
    if (from && new Date(r.created_at) < new Date(from)) return false;
    if (to && new Date(r.created_at) > new Date(to + "T23:59:59")) return false;
    return true;
  });

  function doExport() {
    exportCSV("livraisons.csv", filtered.map((r) => ({
      reference: r.reference, client: r.clients?.full_name, statut: r.status, paiement: r.payment_status,
      mode: r.payment_method, montant: r.total_amount, zone: r.zone, livreur: driverName(r.driver_id),
      date: new Date(r.created_at).toLocaleString("fr-FR"),
    })));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.deliveries")}
        description="Gérez et suivez toutes vos livraisons"
        actions={
          <>
            <Button variant="outline" onClick={doExport}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
            <Button asChild className="bg-gradient-primary shadow-glow">
              <Link to="/deliveries/new"><Truck className="mr-2 h-4 w-4" /> Nouvelle livraison</Link>
            </Button>
          </>
        }
      />

      <Card className="p-4 rounded-2xl shadow-soft border-0 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher (référence ou client)" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="livree">Livrée</SelectItem>
              <SelectItem value="annulee">Annulée</SelectItem>
              <SelectItem value="retournee">Retournée</SelectItem>
            </SelectContent>
          </Select>
          <Select value={pay} onValueChange={setPay}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Paiement" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous paiements</SelectItem>
              <SelectItem value="paye">Payé</SelectItem>
              <SelectItem value="avance">Avancé</SelectItem>
              <SelectItem value="non_paye">Non payé</SelectItem>
            </SelectContent>
          </Select>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Livreur" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous livreurs</SelectItem>
              {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name ?? "—"}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      <Card className="rounded-2xl shadow-soft border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Référence</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Livreur</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Paiement</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t("common.loading")}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-12">
                <div className="flex flex-col items-center gap-2">
                  <Truck className="h-10 w-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Aucune livraison</p>
                  <Button asChild size="sm" className="mt-2 bg-gradient-primary">
                    <Link to="/deliveries/new"><Plus className="mr-1 h-4 w-4" /> Créer la première</Link>
                  </Button>
                </div>
              </TableCell></TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                  <TableCell>{r.clients?.full_name ?? "—"}</TableCell>
                  <TableCell>{driverName(r.driver_id)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.zone ?? "—"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>{paymentBadge(r.payment_status)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCFA(Number(r.total_amount))}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="ghost"><Link to="/deliveries/$id" params={{ id: r.id }}><Eye className="h-4 w-4" /></Link></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, CreditCard, Search, Download, ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatCFA } from "@/lib/i18n";
import { exportCSV } from "@/lib/export-csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/cashier")({
  component: CashierPage,
});

type Mvt = {
  id: string; type: "encaissement" | "depense"; amount: number;
  payment_method: string | null; note: string | null; delivery_id: string | null;
  created_at: string;
};

const PMS = [
  { value: "cash", label: "Espèces" },
  { value: "om", label: "Orange Money" },
  { value: "momo", label: "MoMo" },
  { value: "wave", label: "Wave" },
  { value: "virement", label: "Virement" },
  { value: "carte_bancaire", label: "Carte" },
];

function CashierPage() {
  const { user, role } = useAuth();
  const isDirecteur = role === "directeur";
  const [rows, setRows] = useState<Mvt[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "encaissement" as "encaissement" | "depense", amount: 0, payment_method: "cash", note: "" });

  async function load() {
    const { data } = await supabase.from("cash_movements").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Mvt[]);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (form.amount <= 0) { toast.error("Montant invalide"); return; }
    const { error } = await supabase.from("cash_movements").insert({
      type: form.type, amount: form.amount, payment_method: form.payment_method,
      note: form.note || null, created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Mouvement enregistré");
    setOpen(false);
    setForm({ type: "encaissement", amount: 0, payment_method: "cash", note: "" });
    await load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("cash_movements").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    await load();
  }

  function doExport() {
    exportCSV("caisse.csv", rows.map((r) => ({
      date: new Date(r.created_at).toLocaleString("fr-FR"),
      type: r.type, mode: r.payment_method, montant: r.amount, note: r.note,
    })));
  }

  const totalIn = rows.filter((r) => r.type === "encaissement").reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = rows.filter((r) => r.type === "depense").reduce((s, r) => s + Number(r.amount), 0);
  const solde = totalIn - totalOut;

  const today = new Date().toDateString();
  const todayIn = rows.filter((r) => r.type === "encaissement" && new Date(r.created_at).toDateString() === today).reduce((s, r) => s + Number(r.amount), 0);

  const filtered = rows.filter((r) => {
    if (!search) return true;
    return (r.note ?? "").toLowerCase().includes(search.toLowerCase()) || (r.payment_method ?? "").includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caisse"
        description="Encaissements & journal de caisse"
        actions={
          <>
            <Button variant="outline" onClick={doExport}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
            <Button onClick={() => setOpen(true)} className="bg-gradient-primary shadow-glow"><Plus className="mr-2 h-4 w-4" /> Nouveau mouvement</Button>
          </>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard variant="success" label="Total encaissé" value={formatCFA(totalIn)} icon={ArrowDownCircle} />
        <StatCard variant="warm" label="Total dépenses" value={formatCFA(totalOut)} icon={ArrowUpCircle} />
        <StatCard variant="primary" label="Solde" value={formatCFA(solde)} icon={CreditCard} />
        <StatCard variant="info" label="Encaissé aujourd'hui" value={formatCFA(todayIn)} icon={ArrowDownCircle} />
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Tous les mouvements</TabsTrigger>
          <TabsTrigger value="in">Encaissements</TabsTrigger>
          <TabsTrigger value="out">Dépenses</TabsTrigger>
        </TabsList>
        {(["all", "in", "out"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
            <Card className="p-3 rounded-2xl shadow-soft border-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </Card>
            <Card className="rounded-2xl shadow-soft border-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    {isDirecteur && <TableHead></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.filter((r) => tab === "all" || (tab === "in" ? r.type === "encaissement" : r.type === "depense")).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-FR")}</TableCell>
                      <TableCell>
                        <Badge className={r.type === "encaissement" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning-foreground border-warning/30"} variant="outline">
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.payment_method ?? "—"}</TableCell>
                      <TableCell className="text-sm">{r.note ?? "—"}</TableCell>
                      <TableCell className={`text-right font-bold ${r.type === "encaissement" ? "text-success" : "text-destructive"}`}>
                        {r.type === "encaissement" ? "+" : "-"}{formatCFA(Number(r.amount))}
                      </TableCell>
                      {isDirecteur && (
                        <TableCell><Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
                      )}
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={isDirecteur ? 6 : 5} className="text-center py-12 text-muted-foreground">Aucun mouvement</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau mouvement de caisse</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="encaissement">Encaissement</SelectItem>
                  <SelectItem value="depense">Dépense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant (FCFA) *</Label>
              <Input type="number" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} className="bg-gradient-primary">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

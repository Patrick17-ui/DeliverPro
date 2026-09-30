import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { XCircle, RotateCcw, Gift, Boxes, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { formatCFA } from "@/lib/i18n";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

type DRow = {
  id: string; reference: string; status: string; payment_status: string;
  total_amount: number; created_at: string;
  clients: { full_name: string | null } | null;
};
type FreeRow = { id: string; quantity: number; unit_price: number; products: { name: string } | null; deliveries: { reference: string } | null };
type StockRow = { id: string; name: string; remaining_quantity: number; initial_quantity: number };

function ReportsPage() {
  const [annulees, setAnnulees] = useState<DRow[]>([]);
  const [retours, setRetours] = useState<DRow[]>([]);
  const [free, setFree] = useState<FreeRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: a }, { data: r }, { data: f }, { data: s }] = await Promise.all([
        supabase.from("deliveries").select("id, reference, status, payment_status, total_amount, created_at, clients(full_name)").eq("status", "annulee").order("created_at", { ascending: false }),
        supabase.from("deliveries").select("id, reference, status, payment_status, total_amount, created_at, clients(full_name)").eq("status", "retournee").order("created_at", { ascending: false }),
        supabase.from("delivery_items").select("id, quantity, unit_price, products(name), deliveries(reference)").eq("is_free", true),
        supabase.from("products").select("id, name, remaining_quantity, initial_quantity").order("remaining_quantity", { ascending: true }),
      ]);
      setAnnulees((a as unknown as DRow[]) ?? []);
      setRetours((r as unknown as DRow[]) ?? []);
      setFree((f as unknown as FreeRow[]) ?? []);
      setStock((s as unknown as StockRow[]) ?? []);
    })();
  }, []);

  const tiles = [
    { icon: XCircle, label: "Livraisons annulées", value: String(annulees.length), color: "bg-gradient-warm" },
    { icon: RotateCcw, label: "Retours", value: String(retours.length), color: "bg-gradient-info" },
    { icon: Gift, label: "Gratuités", value: String(free.length), color: "bg-gradient-success" },
    { icon: Boxes, label: "Produits en rupture", value: String(stock.filter((s) => s.remaining_quantity === 0).length), color: "bg-gradient-primary" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Rapports" description="Vision globale de l'activité" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5 rounded-2xl shadow-soft border-0">
            <div className={`h-12 w-12 rounded-xl ${t.color} grid place-items-center text-primary-foreground shadow-glow mb-3`}>
              <t.icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-bold">{t.value}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="annulees">
        <TabsList>
          <TabsTrigger value="annulees">Annulées</TabsTrigger>
          <TabsTrigger value="retours">Retours</TabsTrigger>
          <TabsTrigger value="free">Gratuités</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
        </TabsList>

        {(["annulees", "retours"] as const).map((k) => (
          <TabsContent key={k} value={k} className="mt-4">
            <Card className="rounded-2xl shadow-soft border-0 overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Référence</TableHead><TableHead>Client</TableHead><TableHead className="text-right">Montant</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {(k === "annulees" ? annulees : retours).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                      <TableCell>{r.clients?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatCFA(Number(r.total_amount))}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell><Button asChild size="sm" variant="ghost"><Link to="/deliveries/$id" params={{ id: r.id }}><Eye className="h-4 w-4" /></Link></Button></TableCell>
                    </TableRow>
                  ))}
                  {(k === "annulees" ? annulees : retours).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Aucun résultat</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="free" className="mt-4">
          <Card className="rounded-2xl shadow-soft border-0 overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Livraison</TableHead><TableHead>Produit</TableHead><TableHead>Quantité</TableHead><TableHead className="text-right">Valeur</TableHead></TableRow></TableHeader>
              <TableBody>
                {free.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.deliveries?.reference ?? "—"}</TableCell>
                    <TableCell>{r.products?.name ?? "—"}</TableCell>
                    <TableCell>{r.quantity}</TableCell>
                    <TableCell className="text-right">{formatCFA(Number(r.unit_price) * r.quantity)}</TableCell>
                  </TableRow>
                ))}
                {free.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Aucune gratuité</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card className="rounded-2xl shadow-soft border-0 overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead>Initial</TableHead><TableHead>Restant</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader>
              <TableBody>
                {stock.map((s) => {
                  const low = s.remaining_quantity === 0 ? "Rupture" : s.remaining_quantity < s.initial_quantity * 0.2 ? "Faible" : "OK";
                  const cls = low === "Rupture" ? "bg-destructive/15 text-destructive border-destructive/30" : low === "Faible" ? "bg-warning/15 text-warning-foreground border-warning/30" : "bg-success/15 text-success border-success/30";
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.initial_quantity}</TableCell>
                      <TableCell>{s.remaining_quantity}</TableCell>
                      <TableCell><Badge variant="outline" className={cls}>{low}</Badge></TableCell>
                    </TableRow>
                  );
                })}
                {stock.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Aucun produit</TableCell></TableRow>}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

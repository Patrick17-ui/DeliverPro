import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2, Save, Truck, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatCFA } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/deliveries/$id")({
  component: DeliveryDetailPage,
});

type Delivery = {
  id: string; reference: string; status: string; payment_status: string;
  payment_method: string | null; total_amount: number; created_at: string;
  client_id: string | null; driver_id: string | null; zone: string | null; notes: string | null;
};
type Item = { id: string; product_id: string; quantity: number; unit_price: number; is_free: boolean; products: { name: string } | null };
type Client = { id: string; full_name: string };
type Driver = { id: string; full_name: string | null };

function DeliveryDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isDirecteur = role === "directeur";

  const [d, setD] = useState<Delivery | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);

  async function load() {
    const { data: del } = await supabase.from("deliveries").select("*").eq("id", id).maybeSingle();
    setD(del as Delivery | null);
    if (del?.client_id) {
      const { data: c } = await supabase.from("clients").select("id, full_name").eq("id", del.client_id).maybeSingle();
      setClient(c);
    }
    const [{ data: it }, { data: dr }] = await Promise.all([
      supabase.from("delivery_items").select("id, product_id, quantity, unit_price, is_free, products(name)").eq("delivery_id", id),
      supabase.from("profiles").select("id, full_name"),
    ]);
    setItems((it as unknown as Item[]) ?? []);
    setDrivers((dr as Driver[]) ?? []);
  }
  useEffect(() => { load(); }, [id]);

  async function update(patch: Record<string, unknown>) {
    if (!d) return;
    const { error } = await supabase.from("deliveries").update(patch as never).eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mis à jour");
    await load();
  }

  async function doDelete() {
    if (!d) return;
    const { error } = await supabase.from("deliveries").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Livraison supprimée");
    navigate({ to: "/deliveries" });
  }

  if (!d) return <div className="p-12 text-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Livraison ${d.reference}`}
        description={new Date(d.created_at).toLocaleString("fr-FR")}
        actions={
          <Button variant="outline" asChild><Link to="/deliveries"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link></Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 rounded-2xl shadow-soft border-0 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-gradient-primary border-0">{d.status}</Badge>
            <Badge variant="outline">{d.payment_status}</Badge>
            {d.payment_method && <Badge variant="secondary">{d.payment_method}</Badge>}
            {d.zone && <Badge variant="secondary">📍 {d.zone}</Badge>}
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Client:</span> <b>{client?.full_name ?? "—"}</b></div>
            <div><span className="text-muted-foreground">Total:</span> <b className="text-primary">{formatCFA(Number(d.total_amount))}</b></div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Articles</h3>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{it.products?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{it.quantity} × {formatCFA(Number(it.unit_price))}{it.is_free && " · gratuit"}</p>
                  </div>
                  <span className="font-medium">{formatCFA(it.is_free ? 0 : Number(it.unit_price) * it.quantity)}</span>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-muted-foreground">Aucun article</p>}
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea defaultValue={d.notes ?? ""} rows={3} onBlur={(e) => e.target.value !== (d.notes ?? "") && update({ notes: e.target.value || null })} />
          </div>
        </Card>

        <Card className="p-5 rounded-2xl shadow-soft border-0 space-y-4 h-fit">
          <div>
            <Label>Statut</Label>
            <Select value={d.status} onValueChange={(v) => update({ status: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="livree">Livrée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
                <SelectItem value="retournee">Retournée</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Paiement</Label>
            <Select value={d.payment_status} onValueChange={(v) => update({ payment_status: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="non_paye">Non payé</SelectItem>
                <SelectItem value="avance">Avancé</SelectItem>
                <SelectItem value="paye">Payé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mode de paiement</Label>
            <Select value={d.payment_method ?? ""} onValueChange={(v) => update({ payment_method: v })}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="om">Orange Money</SelectItem>
                <SelectItem value="momo">MoMo</SelectItem>
                <SelectItem value="especes">Espèces</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="carte_bancaire">Carte bancaire</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isDirecteur && (
            <div>
              <Label>Livreur assigné</Label>
              <Select value={d.driver_id ?? ""} onValueChange={(v) => update({ driver_id: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {drivers.map((dr) => <SelectItem key={dr.id} value={dr.id}>{dr.full_name ?? "—"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button variant="outline" onClick={() => update({ status: "livree" })}><CheckCircle2 className="mr-1 h-4 w-4" /> Livrée</Button>
            <Button variant="outline" onClick={() => update({ status: "annulee" })}><XCircle className="mr-1 h-4 w-4" /> Annuler</Button>
            <Button variant="outline" onClick={() => update({ status: "retournee" })}><RotateCcw className="mr-1 h-4 w-4" /> Retour</Button>
            <Button variant="outline" onClick={() => update({ status: "en_cours" })}><Truck className="mr-1 h-4 w-4" /> En cours</Button>
          </div>

          {isDirecteur && (
            <Button variant="outline" className="w-full text-destructive" onClick={() => setConfirmDel(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </Button>
          )}
        </Card>
      </div>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette livraison ?</AlertDialogTitle>
            <AlertDialogDescription>Action irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

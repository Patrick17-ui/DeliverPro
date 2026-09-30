import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, Package, Plus, Minus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatCFA } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/deliveries/new")({
  component: NewDeliveryPage,
});

type Product = {
  id: string;
  name: string;
  price: number;
  remaining_quantity: number;
  category: string | null;
};
type Client = { id: string; full_name: string };
type Cart = { product: Product; qty: number; free: boolean };

function NewDeliveryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Cart[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState("non_paye");
  const [paymentMethod, setPaymentMethod] = useState("especes");
  const [zone, setZone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("products").select("id, name, price, remaining_quantity, category").order("name"),
        supabase.from("clients").select("id, full_name").order("full_name"),
      ]);
      setProducts(p ?? []);
      setClients(c ?? []);
    })();
  }, []);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const total = cart.reduce((s, c) => s + (c.free ? 0 : c.qty * Number(c.product.price)), 0);

  function addToCart(p: Product) {
    setCart((cur) => {
      if (cur.find((c) => c.product.id === p.id)) return cur;
      return [...cur, { product: p, qty: 1, free: false }];
    });
  }
  function changeQty(id: string, delta: number) {
    setCart((cur) => cur.map((c) => c.product.id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c));
  }
  function removeItem(id: string) {
    setCart((cur) => cur.filter((c) => c.product.id !== id));
  }

  async function save() {
    if (!clientId) { toast.error("Sélectionnez un client"); return; }
    if (cart.length === 0) { toast.error("Ajoutez au moins un produit"); return; }
    setBusy(true);
    try {
      const { data: del, error } = await supabase.from("deliveries").insert({
        client_id: clientId,
        driver_id: user?.id,
        payment_status: paymentStatus as "non_paye" | "paye" | "avance",
        payment_method: paymentMethod as "om" | "momo" | "especes" | "virement" | "carte_bancaire",
        total_amount: total,
        zone: zone || null,
      }).select("id").single();
      if (error) throw error;
      const items = cart.map((c) => ({
        delivery_id: del!.id,
        product_id: c.product.id,
        quantity: c.qty,
        unit_price: Number(c.product.price),
        is_free: c.free,
      }));
      const { error: e2 } = await supabase.from("delivery_items").insert(items);
      if (e2) throw e2;
      toast.success("Livraison enregistrée");
      navigate({ to: "/deliveries" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={step === 1 ? "Sélection des produits" : "Finaliser la livraison"}
        description={step === 1 ? "Choisissez les produits à livrer" : "Client, paiement & validation"}
        actions={
          <Button variant="outline" asChild>
            <Link to="/deliveries"><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Link>
          </Button>
        }
      />

      {step === 1 && (
        <>
          <Card className="p-4 rounded-2xl shadow-soft border-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher un produit (sérum, démêlant…)"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from(new Set(products.map((p) => p.category).filter(Boolean))).slice(0, 8).map((c) => (
                <Badge key={c} variant="secondary" className="cursor-pointer">{c}</Badge>
              ))}
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 && (
              <Card className="col-span-full p-12 text-center text-muted-foreground rounded-2xl border-0 shadow-soft">
                <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                Aucun produit. Ajoutez d'abord des produits depuis le module Produits.
              </Card>
            )}
            {filtered.map((p) => {
              const inCart = cart.find((c) => c.product.id === p.id);
              return (
                <Card key={p.id} className={`p-4 rounded-2xl border-0 shadow-soft cursor-pointer transition-all ${inCart ? "ring-2 ring-primary" : "hover:shadow-elevated"}`}
                  onClick={() => addToCart(p)}>
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.category}</p>
                    </div>
                    <Badge className="bg-gradient-primary text-primary-foreground border-0">{formatCFA(Number(p.price))}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stock</span>
                    <span className="font-medium">{p.remaining_quantity}</span>
                  </div>
                </Card>
              );
            })}
          </div>

          {cart.length > 0 && (
            <div className="sticky bottom-4 flex justify-end">
              <Button size="lg" onClick={() => setStep(2)} className="bg-gradient-primary shadow-glow">
                Continuer ({cart.length} produit{cart.length > 1 ? "s" : ""}) →
              </Button>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 rounded-2xl shadow-soft border-0 lg:col-span-2 space-y-4">
            <div>
              <label className="text-sm font-medium">Client</label>
              <div className="flex gap-2 mt-1.5">
                <Select value={clientId} onValueChange={setClientId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" asChild><Link to="/clients"><Plus className="h-4 w-4" /></Link></Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Zone de livraison</label>
              <Input className="mt-1.5" placeholder="Ex. Plateau, Yoff…" value={zone} onChange={(e) => setZone(e.target.value)} />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Articles</h3>
              <div className="space-y-2">
                {cart.map((c) => (
                  <div key={c.product.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatCFA(Number(c.product.price))} / unité</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeQty(c.product.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-10 text-center font-medium">{c.qty}</span>
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => changeQty(c.product.id, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => removeItem(c.product.id)}>×</Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-3 w-full" onClick={() => setStep(1)}>
                <Plus className="mr-2 h-4 w-4" /> Ajouter des articles
              </Button>
            </div>
          </Card>

          <Card className="p-5 rounded-2xl shadow-soft border-0 space-y-4 h-fit">
            <div>
              <label className="text-sm font-medium">Statut du paiement</label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_paye">Non payé</SelectItem>
                  <SelectItem value="paye">Payé</SelectItem>
                  <SelectItem value="avance">Avancé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Mode de paiement</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="om">Orange Money</SelectItem>
                  <SelectItem value="momo">MoMo</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="carte_bancaire">Carte bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-3 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Articles</span><span>{cart.length}</span>
              </div>
              <div className="flex justify-between mt-2 text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-primary">{formatCFA(total)}</span>
              </div>
            </div>

            <Button onClick={save} disabled={busy} size="lg" className="w-full bg-gradient-primary shadow-glow">
              <Save className="mr-2 h-4 w-4" /> Enregistrer la livraison
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

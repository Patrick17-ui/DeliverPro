import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, Package, Edit, Trash2, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { FileUpload } from "@/components/file-upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatCFA } from "@/lib/i18n";
import { exportCSV } from "@/lib/export-csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
});

type P = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  image_url: string | null;
  price: number;
  initial_quantity: number;
  remaining_quantity: number;
};

const emptyForm = { name: "", description: "", category: "", unit: "pcs", image_url: null as string | null, price: 0, initial_quantity: 0 };

function ProductsPage() {
  const { role } = useAuth();
  const isDirecteur = role === "directeur";
  const [items, setItems] = useState<P[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<P | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<P | null>(null);
  const [supplyOpen, setSupplyOpen] = useState<P | null>(null);
  const [supplyQty, setSupplyQty] = useState(0);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }
  function openEdit(p: P) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description ?? "", category: p.category ?? "",
      unit: p.unit ?? "pcs", image_url: p.image_url, price: Number(p.price),
      initial_quantity: p.initial_quantity,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    setBusy(true);
    try {
      if (editing) {
        const { error } = await supabase.from("products").update({
          name: form.name, description: form.description || null, category: form.category || null,
          unit: form.unit || null, image_url: form.image_url, price: form.price,
          initial_quantity: form.initial_quantity,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Produit mis à jour");
      } else {
        const { error } = await supabase.from("products").insert({
          name: form.name, description: form.description || null, category: form.category || null,
          unit: form.unit || null, image_url: form.image_url, price: form.price,
          initial_quantity: form.initial_quantity, remaining_quantity: form.initial_quantity,
        });
        if (error) throw error;
        toast.success("Produit ajouté");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirmDel) return;
    const { error } = await supabase.from("products").delete().eq("id", confirmDel.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    setConfirmDel(null);
    await load();
  }

  async function doSupply() {
    if (!supplyOpen || supplyQty <= 0) return;
    const { error } = await supabase.from("products").update({
      initial_quantity: supplyOpen.initial_quantity + supplyQty,
      remaining_quantity: supplyOpen.remaining_quantity + supplyQty,
    }).eq("id", supplyOpen.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`+${supplyQty} ajoutés`);
    setSupplyOpen(null); setSupplyQty(0);
    await load();
  }

  function doExport() {
    exportCSV("produits.csv", items.map((p) => ({
      nom: p.name, categorie: p.category, prix: p.price, unite: p.unit,
      stock_initial: p.initial_quantity, stock_restant: p.remaining_quantity,
    })));
  }

  const cats = Array.from(new Set(items.map((i) => i.category).filter(Boolean))) as string[];
  const filtered = items.filter((p) => {
    if (filterCat !== "all" && p.category !== filterCat) return false;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        description="Catalogue & approvisionnements"
        actions={
          <>
            <Button variant="outline" onClick={doExport}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
            {isDirecteur && (
              <Button onClick={openCreate} className="bg-gradient-primary shadow-glow"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
            )}
          </>
        }
      />

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">Mes produits</TabsTrigger>
          <TabsTrigger value="supply">Approvisionnement</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="space-y-4 mt-4">
          <Card className="p-3 rounded-2xl shadow-soft border-0 flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher un produit" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterCat} onValueChange={setFilterCat}>
              <SelectTrigger className="w-48"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.length === 0 && (
              <Card className="col-span-full p-12 text-center rounded-2xl shadow-soft border-0">
                <Package className="h-10 w-10 mx-auto opacity-40 mb-2" />
                <p className="text-muted-foreground">Aucun produit</p>
              </Card>
            )}
            {filtered.map((p) => {
              const inStock = p.remaining_quantity > 0;
              return (
                <Card key={p.id} className="overflow-hidden rounded-2xl shadow-soft border-0 hover:shadow-elevated transition-shadow">
                  <div className="aspect-video bg-gradient-warm relative">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-primary-foreground/70">
                        <Package className="h-10 w-10" />
                      </div>
                    )}
                    <Badge className={`absolute top-2 right-2 border-0 ${inStock ? "bg-success" : "bg-destructive"} text-white`}>
                      {inStock ? "En stock" : "Rupture"}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      <span className="text-primary font-bold text-sm whitespace-nowrap">{formatCFA(Number(p.price))}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{p.description ?? "—"}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Initial: <b className="text-foreground">{p.initial_quantity}</b></span>
                      <span className="text-muted-foreground">Restant: <b className="text-foreground">{p.remaining_quantity}</b></span>
                    </div>
                    {isDirecteur && (
                      <div className="flex gap-1 pt-2 border-t">
                        <Button size="sm" variant="ghost" className="flex-1" onClick={() => openEdit(p)} title="Modifier"><Edit className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="flex-1" onClick={() => { setSupplyOpen(p); setSupplyQty(0); }} title="Ajouter stock"><PackagePlus className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => setConfirmDel(p)} title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="supply" className="mt-4">
          <Card className="rounded-2xl shadow-soft border-0 overflow-hidden">
            <div className="p-4 border-b font-semibold">Suivi de stock</div>
            <div className="divide-y">
              {items.map((p) => {
                const used = p.initial_quantity - p.remaining_quantity;
                const pct = p.initial_quantity > 0 ? (used / p.initial_quantity) * 100 : 0;
                return (
                  <div key={p.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{p.name}</p>
                      <div className="h-2 mt-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Vendu {used} / {p.initial_quantity} · Restant {p.remaining_quantity}</p>
                    </div>
                    {isDirecteur && (
                      <Button size="sm" variant="outline" onClick={() => { setSupplyOpen(p); setSupplyQty(0); }}>
                        <PackagePlus className="mr-2 h-4 w-4" /> Réappro
                      </Button>
                    )}
                  </div>
                );
              })}
              {items.length === 0 && <div className="p-12 text-center text-muted-foreground">Aucun produit</div>}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FileUpload bucket="products" shape="square" value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} fallback={form.name || "?"} />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Catégorie</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            </div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Unité</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div><Label>Quantité</Label><Input type="number" value={form.initial_quantity} onChange={(e) => setForm({ ...form, initial_quantity: Number(e.target.value) })} /></div>
              <div><Label>Prix (FCFA)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={busy} className="bg-gradient-primary">{busy ? "…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supply */}
      <Dialog open={!!supplyOpen} onOpenChange={(o) => !o && setSupplyOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Réapprovisionner « {supplyOpen?.name} »</DialogTitle></DialogHeader>
          <Label>Quantité à ajouter</Label>
          <Input type="number" min={1} value={supplyQty} onChange={(e) => setSupplyQty(Number(e.target.value))} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplyOpen(null)}>Annuler</Button>
            <Button onClick={doSupply} className="bg-gradient-primary">Ajouter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>« {confirmDel?.name} » sera définitivement supprimé.</AlertDialogDescription>
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

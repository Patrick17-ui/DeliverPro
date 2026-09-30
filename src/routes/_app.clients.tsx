import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, Users, Phone, MapPin, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { FileUpload } from "@/components/file-upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportCSV } from "@/lib/export-csv";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clients")({
  component: ClientsPage,
});

type C = {
  id: string; full_name: string; avatar_url: string | null;
  phone: string | null; address: string | null; city: string | null; district: string | null;
};

const emptyForm = { full_name: "", avatar_url: null as string | null, phone: "", address: "", city: "", district: "" };

function ClientsPage() {
  const { user, role } = useAuth();
  const isDirecteur = role === "directeur";
  const [items, setItems] = useState<C[]>([]);
  const [search, setSearch] = useState("");
  const [filterCity, setFilterCity] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<C | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<C | null>(null);

  async function load() {
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null); setForm({ ...emptyForm }); setOpen(true);
  }
  function openEdit(c: C) {
    setEditing(c);
    setForm({
      full_name: c.full_name, avatar_url: c.avatar_url,
      phone: c.phone ?? "", address: c.address ?? "",
      city: c.city ?? "", district: c.district ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.full_name.trim()) { toast.error("Nom requis"); return; }
    setBusy(true);
    try {
      if (editing) {
        const { error } = await supabase.from("clients").update({
          full_name: form.full_name, avatar_url: form.avatar_url,
          phone: form.phone || null, address: form.address || null,
          city: form.city || null, district: form.district || null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Client mis à jour");
      } else {
        const { error } = await supabase.from("clients").insert({
          full_name: form.full_name, avatar_url: form.avatar_url,
          phone: form.phone || null, address: form.address || null,
          city: form.city || null, district: form.district || null,
          created_by: user?.id,
        });
        if (error) throw error;
        toast.success("Client ajouté");
      }
      setOpen(false);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function doDelete() {
    if (!confirmDel) return;
    const { error } = await supabase.from("clients").delete().eq("id", confirmDel.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Supprimé");
    setConfirmDel(null);
    await load();
  }

  function doExport() {
    exportCSV("clients.csv", items.map((c) => ({
      nom: c.full_name, telephone: c.phone, adresse: c.address, ville: c.city, quartier: c.district,
    })));
  }

  const cities = Array.from(new Set(items.map((i) => i.city).filter(Boolean))) as string[];
  const filtered = items.filter((c) => {
    if (filterCity !== "all" && c.city !== filterCity) return false;
    const q = search.toLowerCase();
    return !q || c.full_name.toLowerCase().includes(q) || (c.phone ?? "").includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Gérez votre base clients"
        actions={
          <>
            <Button variant="outline" onClick={doExport}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
            <Button onClick={openCreate} className="bg-gradient-primary shadow-glow"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
          </>
        }
      />

      <Card className="p-3 rounded-2xl shadow-soft border-0 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher par nom ou téléphone" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterCity} onValueChange={setFilterCity}>
          <SelectTrigger className="w-48"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les villes</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <Card className="col-span-full p-12 text-center rounded-2xl shadow-soft border-0">
            <Users className="h-10 w-10 mx-auto opacity-40 mb-2" />
            <p className="text-muted-foreground">Aucun client</p>
          </Card>
        )}
        {filtered.map((c) => (
          <Card key={c.id} className="p-5 rounded-2xl shadow-soft border-0 hover:shadow-elevated transition-shadow">
            <div className="flex items-start gap-3">
              <Avatar className="h-14 w-14">
                <AvatarImage src={c.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {c.full_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{c.full_name}</h3>
                {c.phone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {c.phone}</p>}
                {(c.city || c.district) && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {[c.district, c.city].filter(Boolean).join(", ")}</p>}
              </div>
            </div>
            <div className="flex gap-1 pt-3 mt-3 border-t">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => openEdit(c)}><Edit className="h-3.5 w-3.5 mr-1" /> Éditer</Button>
              {isDirecteur && (
                <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => setConfirmDel(c)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer</Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FileUpload bucket="avatars" value={form.avatar_url} onChange={(url) => setForm({ ...form, avatar_url: url })} fallback={form.full_name || "?"} />
            <div><Label>Nom complet *</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Adresse postale</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Quartier</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={busy} className="bg-gradient-primary">{busy ? "…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>« {confirmDel?.full_name} » sera définitivement supprimé.</AlertDialogDescription>
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

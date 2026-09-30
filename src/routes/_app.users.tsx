import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, UserCog, Edit, Trash2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { FileUpload } from "@/components/file-upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { exportCSV } from "@/lib/export-csv";
import { adminCreateUser, adminUpdateUser, adminDeleteUser } from "@/lib/users.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

type Row = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  role: "directeur" | "livreur" | null;
};

const emptyForm = {
  email: "", password: "",
  first_name: "", last_name: "",
  phone: "", address: "", city: "", district: "",
  avatar_url: "" as string | null,
  role: "livreur" as "directeur" | "livreur",
};

function UsersPage() {
  const { role: myRole, user: me } = useAuth();
  const isDirecteur = myRole === "directeur";
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "directeur" | "livreur">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Row | null>(null);

  async function load() {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, first_name, last_name, avatar_url, phone, address, city, district"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const map = new Map((roles ?? []).map((r) => [r.user_id, r.role as "directeur" | "livreur"]));
    setRows((profiles ?? []).map((p) => ({ ...p, role: map.get(p.id) ?? null })));
  }
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setOpen(true);
  }
  function openEdit(r: Row) {
    setEditing(r);
    setForm({
      email: "", password: "",
      first_name: r.first_name ?? "",
      last_name: r.last_name ?? "",
      phone: r.phone ?? "",
      address: r.address ?? "",
      city: r.city ?? "",
      district: r.district ?? "",
      avatar_url: r.avatar_url,
      role: r.role ?? "livreur",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error("Nom et prénom requis"); return; }
    setBusy(true);
    try {
      if (editing) {
        await adminUpdateUser({
          data: {
            user_id: editing.id,
            first_name: form.first_name, last_name: form.last_name,
            phone: form.phone || null, address: form.address || null,
            city: form.city || null, district: form.district || null,
            avatar_url: form.avatar_url || null,
            role: form.role,
            password: form.password || undefined,
          },
        });
        toast.success("Utilisateur mis à jour");
      } else {
        if (!form.email.trim() || !form.password.trim()) { toast.error("Email et mot de passe requis"); setBusy(false); return; }
        await adminCreateUser({
          data: {
            email: form.email, password: form.password,
            first_name: form.first_name, last_name: form.last_name,
            phone: form.phone || null, address: form.address || null,
            city: form.city || null, district: form.district || null,
            avatar_url: form.avatar_url || null,
            role: form.role,
          },
        });
        toast.success("Utilisateur créé");
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
    try {
      await adminDeleteUser({ data: { user_id: confirmDel.id } });
      toast.success("Utilisateur supprimé");
      setConfirmDel(null);
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function doExport() {
    exportCSV("utilisateurs.csv", rows.map((r) => ({
      nom: r.full_name, telephone: r.phone, ville: r.city, quartier: r.district, role: r.role,
    })));
  }

  const filtered = rows.filter((r) => {
    if (filterRole !== "all" && r.role !== filterRole) return false;
    const q = search.toLowerCase();
    return !q || (r.full_name ?? "").toLowerCase().includes(q) || (r.phone ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Directeurs et livreurs de votre équipe"
        actions={
          <>
            <Button variant="outline" onClick={doExport}><Download className="mr-2 h-4 w-4" /> Exporter</Button>
            {isDirecteur && (
              <Button onClick={openCreate} className="bg-gradient-primary shadow-glow"><Plus className="mr-2 h-4 w-4" /> Ajouter</Button>
            )}
          </>
        }
      />

      <Card className="p-3 rounded-2xl shadow-soft border-0 flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as typeof filterRole)}>
          <SelectTrigger className="w-44"><Filter className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="directeur">Directeur</SelectItem>
            <SelectItem value="livreur">Livreur</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && (
          <Card className="col-span-full p-12 text-center rounded-2xl shadow-soft border-0 text-muted-foreground">
            <UserCog className="h-10 w-10 mx-auto opacity-40 mb-2" />
            Aucun utilisateur
          </Card>
        )}
        {filtered.map((u) => (
          <Card key={u.id} className="p-4 rounded-2xl shadow-soft border-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {(u.full_name ?? "?")[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{u.full_name ?? "Sans nom"}</p>
                <p className="text-xs text-muted-foreground truncate">{u.phone ?? "—"} · {u.city ?? "—"}</p>
              </div>
              {u.role && (
                <Badge className={u.role === "directeur" ? "bg-gradient-primary border-0" : ""} variant={u.role === "directeur" ? "default" : "secondary"}>
                  {u.role}
                </Badge>
              )}
            </div>
            {isDirecteur && (
              <div className="flex gap-1 pt-3 mt-3 border-t">
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => openEdit(u)}><Edit className="h-3.5 w-3.5 mr-1" /> Éditer</Button>
                <Button
                  size="sm" variant="ghost"
                  className="flex-1 text-destructive"
                  disabled={u.id === me?.id}
                  onClick={() => setConfirmDel(u)}
                ><Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer</Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FileUpload
              bucket="avatars"
              value={form.avatar_url}
              onChange={(url) => setForm({ ...form, avatar_url: url })}
              fallback={form.first_name || "?"}
            />
            {!editing && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Mot de passe *</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prénom *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
              <div><Label>Nom *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>Rôle *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "directeur" | "livreur" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="directeur">Directeur</SelectItem>
                    <SelectItem value="livreur">Livreur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Adresse postale</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div><Label>Quartier</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
            </div>
            {editing && (
              <div>
                <Label className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> Nouveau mot de passe (optionnel)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Laisser vide pour ne pas changer" />
              </div>
            )}
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
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel?.full_name} sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
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

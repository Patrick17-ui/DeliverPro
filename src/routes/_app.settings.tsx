import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Building2, MapPin, CreditCard, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { FileUpload } from "@/components/file-upload";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

type Company = {
  id: string; name: string; address: string | null; phone: string | null; email: string | null;
  logo_url: string | null; currency: string;
  delivery_zones: string[]; payment_methods: string[];
};

function SettingsPage() {
  const { user, role } = useAuth();
  const isDirecteur = role === "directeur";
  const [profile, setProfile] = useState({ full_name: "", avatar_url: null as string | null, phone: "", address: "", city: "", district: "" });
  const [company, setCompany] = useState<Company | null>(null);
  const [zoneInput, setZoneInput] = useState("");
  const [pmInput, setPmInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) setProfile({
        full_name: p.full_name ?? "", avatar_url: p.avatar_url, phone: p.phone ?? "",
        address: p.address ?? "", city: p.city ?? "", district: p.district ?? "",
      });
      const { data: c } = await supabase.from("company_settings").select("*").limit(1).maybeSingle();
      if (c) setCompany(c as Company);
    })();
  }, [user]);

  async function saveProfile() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name || null,
      avatar_url: profile.avatar_url,
      phone: profile.phone || null, address: profile.address || null,
      city: profile.city || null, district: profile.district || null,
    }).eq("id", user.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profil mis à jour");
  }

  async function saveCompany() {
    if (!company) return;
    setBusy(true);
    const { error } = await supabase.from("company_settings").update({
      name: company.name, address: company.address, phone: company.phone, email: company.email,
      logo_url: company.logo_url, currency: company.currency,
      delivery_zones: company.delivery_zones, payment_methods: company.payment_methods,
    }).eq("id", company.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paramètres mis à jour");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Paramètres" description="Profil & informations de l'entreprise" />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Mon profil</TabsTrigger>
          {isDirecteur && <TabsTrigger value="company"><Building2 className="mr-1 h-4 w-4" /> Entreprise</TabsTrigger>}
          {isDirecteur && <TabsTrigger value="zones"><MapPin className="mr-1 h-4 w-4" /> Zones</TabsTrigger>}
          {isDirecteur && <TabsTrigger value="payments"><CreditCard className="mr-1 h-4 w-4" /> Paiements</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <Card className="p-6 rounded-2xl shadow-soft border-0 space-y-4">
            <FileUpload bucket="avatars" value={profile.avatar_url} onChange={(url) => setProfile({ ...profile, avatar_url: url })} fallback={profile.full_name || "?"} />
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Nom complet</Label><Input className="mt-1.5" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input className="mt-1.5" value={user?.email ?? ""} disabled /></div>
              <div><Label>Téléphone</Label><Input className="mt-1.5" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              <div><Label>Adresse postale</Label><Input className="mt-1.5" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></div>
              <div><Label>Ville</Label><Input className="mt-1.5" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} /></div>
              <div><Label>Quartier</Label><Input className="mt-1.5" value={profile.district} onChange={(e) => setProfile({ ...profile, district: e.target.value })} /></div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={saveProfile} disabled={busy} className="bg-gradient-primary shadow-glow"><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
            </div>
          </Card>
        </TabsContent>

        {isDirecteur && company && (
          <>
            <TabsContent value="company" className="mt-4">
              <Card className="p-6 rounded-2xl shadow-soft border-0 space-y-4">
                <FileUpload bucket="avatars" shape="square" value={company.logo_url} onChange={(url) => setCompany({ ...company, logo_url: url })} fallback={company.name} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <div><Label>Nom de l'entreprise</Label><Input className="mt-1.5" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></div>
                  <div><Label>Devise</Label><Input className="mt-1.5" value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value })} /></div>
                  <div><Label>Téléphone</Label><Input className="mt-1.5" value={company.phone ?? ""} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></div>
                  <div><Label>Email</Label><Input className="mt-1.5" value={company.email ?? ""} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Adresse</Label><Input className="mt-1.5" value={company.address ?? ""} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={saveCompany} disabled={busy} className="bg-gradient-primary shadow-glow"><Save className="mr-2 h-4 w-4" /> Enregistrer</Button>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="zones" className="mt-4">
              <Card className="p-6 rounded-2xl shadow-soft border-0 space-y-4">
                <Label>Zones de livraison</Label>
                <div className="flex gap-2">
                  <Input placeholder="Ex. Plateau" value={zoneInput} onChange={(e) => setZoneInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && zoneInput.trim()) { setCompany({ ...company, delivery_zones: [...company.delivery_zones, zoneInput.trim()] }); setZoneInput(""); } }} />
                  <Button type="button" onClick={() => { if (zoneInput.trim()) { setCompany({ ...company, delivery_zones: [...company.delivery_zones, zoneInput.trim()] }); setZoneInput(""); } }}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {company.delivery_zones.map((z, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">{z}<button onClick={() => setCompany({ ...company, delivery_zones: company.delivery_zones.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button></Badge>
                  ))}
                  {company.delivery_zones.length === 0 && <p className="text-sm text-muted-foreground">Aucune zone</p>}
                </div>
                <div className="flex justify-end"><Button onClick={saveCompany} disabled={busy} className="bg-gradient-primary"><Save className="mr-2 h-4 w-4" /> Enregistrer</Button></div>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <Card className="p-6 rounded-2xl shadow-soft border-0 space-y-4">
                <Label>Modes de paiement actifs</Label>
                <div className="flex gap-2">
                  <Input placeholder="Ex. wave" value={pmInput} onChange={(e) => setPmInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && pmInput.trim()) { setCompany({ ...company, payment_methods: [...company.payment_methods, pmInput.trim()] }); setPmInput(""); } }} />
                  <Button type="button" onClick={() => { if (pmInput.trim()) { setCompany({ ...company, payment_methods: [...company.payment_methods, pmInput.trim()] }); setPmInput(""); } }}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {company.payment_methods.map((p, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">{p}<button onClick={() => setCompany({ ...company, payment_methods: company.payment_methods.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button></Badge>
                  ))}
                </div>
                <div className="flex justify-end"><Button onClick={saveCompany} disabled={busy} className="bg-gradient-primary"><Save className="mr-2 h-4 w-4" /> Enregistrer</Button></div>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

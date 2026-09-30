import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, CheckCircle2, Truck, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/integrations/supabase/client";
import { formatCFA } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/order-room")({
  component: OrderRoomPage,
});

type D = {
  id: string; reference: string; status: string; total_amount: number;
  created_at: string; zone: string | null;
  clients: { full_name: string | null } | null;
};

function OrderRoomPage() {
  const [rows, setRows] = useState<D[]>([]);
  async function load() {
    const { data } = await supabase
      .from("deliveries")
      .select("id, reference, status, total_amount, created_at, zone, clients(full_name)")
      .eq("status", "en_cours")
      .order("created_at", { ascending: false });
    setRows((data as unknown as D[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function markReady(id: string) {
    const { error } = await supabase.from("deliveries").update({ status: "livree" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Marquée livrée");
    await load();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Salle de commande" description="Préparation des commandes en cours" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.length === 0 && (
          <Card className="col-span-full p-12 text-center rounded-2xl shadow-soft border-0 text-muted-foreground">
            <Boxes className="h-10 w-10 mx-auto opacity-40 mb-2" />
            Aucune commande en cours
          </Card>
        )}
        {rows.map((d) => (
          <Card key={d.id} className="p-5 rounded-2xl shadow-soft border-0 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-muted-foreground">{d.reference}</p>
                <h3 className="font-semibold mt-1">{d.clients?.full_name ?? "—"}</h3>
              </div>
              <Badge className="bg-warning/15 text-warning-foreground border-warning/30" variant="outline">En cours</Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{d.zone ?? "—"}</span>
              <span className="font-bold text-primary">{formatCFA(Number(d.total_amount))}</span>
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button asChild variant="outline" className="flex-1"><Link to="/deliveries/$id" params={{ id: d.id }}><Eye className="mr-1 h-4 w-4" /> Détail</Link></Button>
              <Button onClick={() => markReady(d.id)} className="flex-1 bg-gradient-success">
                <CheckCircle2 className="mr-1 h-4 w-4" /> Livrée
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

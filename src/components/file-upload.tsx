import { useRef, useState } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Props = {
  bucket: "avatars" | "products";
  value: string | null;
  onChange: (url: string | null) => void;
  fallback?: string;
  shape?: "circle" | "square";
};

export function FileUpload({ bucket, value, onChange, fallback = "?", shape = "circle" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) { toast.error("Image trop grande (max 5 Mo)"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Image envoyée");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isCircle = shape === "circle";

  return (
    <div className="flex items-center gap-3">
      {isCircle ? (
        <Avatar className="h-20 w-20">
          <AvatarImage src={value ?? undefined} />
          <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl">
            {fallback[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="h-24 w-24 rounded-xl overflow-hidden bg-gradient-warm grid place-items-center">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <Upload className="h-6 w-6 text-primary-foreground/70" />}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
          Choisir
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X className="mr-2 h-3 w-3" /> Retirer
          </Button>
        )}
      </div>
    </div>
  );
}

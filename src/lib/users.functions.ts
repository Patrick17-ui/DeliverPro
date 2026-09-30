import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(72),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  district: z.string().trim().max(80).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  role: z.enum(["directeur", "livreur"]),
});

const updateSchema = z.object({
  user_id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80).optional(),
  last_name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  district: z.string().trim().max(80).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  role: z.enum(["directeur", "livreur"]).optional(),
  password: z.string().min(6).max(72).optional(),
});

const deleteSchema = z.object({ user_id: z.string().uuid() });

function safeError(scope: string, error: unknown, userMsg: string): never {
  console.error(`[${scope}]`, error);
  throw new Error(userMsg);
}

async function assertDirecteur(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "directeur")
    .maybeSingle();
  if (error) safeError("assertDirecteur", error, "Erreur d'autorisation");
  if (!data) throw new Error("Action réservée au directeur");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDirecteur(context.userId);

    const fullName = `${data.first_name} ${data.last_name}`.trim();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: data.first_name, last_name: data.last_name, full_name: fullName },
    });
    if (error) safeError("users.fn", error, "Action impossible");
    const newId = created.user!.id;

    // Trigger has_new_user fills profile + default role; update with extra fields & role.
    await supabaseAdmin.from("profiles").update({
      first_name: data.first_name,
      last_name: data.last_name,
      full_name: fullName,
      phone: data.phone ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      district: data.district ?? null,
      avatar_url: data.avatar_url ?? null,
    }).eq("id", newId);

    // Sync role: delete existing then insert chosen role
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: data.role });

    return { id: newId };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDirecteur(context.userId);

    const profileUpdates: {
      first_name?: string; last_name?: string; full_name?: string;
      phone?: string | null; address?: string | null; city?: string | null;
      district?: string | null; avatar_url?: string | null;
    } = {};
    if (data.first_name !== undefined) profileUpdates.first_name = data.first_name;
    if (data.last_name !== undefined) profileUpdates.last_name = data.last_name;
    if (data.first_name || data.last_name) {
      const { data: cur } = await supabaseAdmin.from("profiles").select("first_name,last_name").eq("id", data.user_id).maybeSingle();
      const fn = data.first_name ?? cur?.first_name ?? "";
      const ln = data.last_name ?? cur?.last_name ?? "";
      profileUpdates.full_name = `${fn} ${ln}`.trim();
    }
    if (data.phone !== undefined) profileUpdates.phone = data.phone;
    if (data.address !== undefined) profileUpdates.address = data.address;
    if (data.city !== undefined) profileUpdates.city = data.city;
    if (data.district !== undefined) profileUpdates.district = data.district;
    if (data.avatar_url !== undefined) profileUpdates.avatar_url = data.avatar_url;

    if (Object.keys(profileUpdates).length > 0) {
      const { error } = await supabaseAdmin.from("profiles").update(profileUpdates).eq("id", data.user_id);
      if (error) safeError("users.fn", error, "Action impossible");
    }

    if (data.role) {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.user_id, role: data.role });
    }

    if (data.password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, { password: data.password });
      if (error) safeError("users.fn", error, "Action impossible");
    }

    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertDirecteur(context.userId);
    if (data.user_id === context.userId) throw new Error("Vous ne pouvez pas vous supprimer vous-même");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) safeError("users.fn", error, "Action impossible");
    return { ok: true };
  });

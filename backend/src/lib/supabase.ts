import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseServiceRoleKey
);

function resolveSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const supabase = resolveSupabase();

export const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

export { supabase };

export function getPublicStorageUrl(bucket: string, filePath: string): string {
  const url = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : "";
  return `${url}/storage/v1/object/public/${bucket}/${filePath}`;
}

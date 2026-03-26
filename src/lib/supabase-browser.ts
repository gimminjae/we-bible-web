"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseConfig } from "@/lib/supabase";

let browserClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    const { supabaseUrl, supabasePublishableKey } = requireSupabaseConfig();
    browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey);
  }

  return browserClient;
}

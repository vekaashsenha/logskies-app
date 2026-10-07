import { createClient } from "@logskies/api";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const authClient = url && key ? createClient(url, key) : null;

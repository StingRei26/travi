import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── Types mirroring the web app DB schema ─────────────────────────

export interface Profile {
  id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
}

export interface Stop {
  id: string;
  travi_id: string;
  name: string;
  location: string;
  date: string | null;
  rating: number;
  review: string;
  type: "hotel" | "restaurant" | "attraction" | "experience";
  emoji: string;
  order_index: number;
  image_urls?: string[];
}

export interface TraviRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  emoji: string;
  country: string;
  country_flag: string;
  cover_gradient: string;
  cover_image_url: string | null;
  tags: string[];
  is_public: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  stops?: Stop[];
  profiles?: Pick<Profile, "name" | "handle" | "avatar_url">;
}

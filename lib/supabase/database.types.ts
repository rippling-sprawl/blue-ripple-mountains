// Hand-maintained until `npm run gen-types` is run against the Supabase project.
// Mirrors supabase/migrations/0001_init.sql.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json | undefined }
  | Json[];

type Timestamp = string;
type ISODate = string;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          is_admin: boolean;
          created_at: Timestamp;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          is_admin?: boolean;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      bands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["bands"]["Insert"]>;
        Relationships: [];
      };
      shows: {
        Row: {
          id: string;
          slug: string;
          date_start: ISODate;
          date_end: ISODate | null;
          venue_name: string | null;
          city: string | null;
          state: string | null;
          is_festival: boolean;
          festival_name: string | null;
          is_verified: boolean;
          created_by: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          slug: string;
          date_start: ISODate;
          date_end?: ISODate | null;
          venue_name?: string | null;
          city?: string | null;
          state?: string | null;
          is_festival?: boolean;
          festival_name?: string | null;
          is_verified?: boolean;
          created_by?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["shows"]["Insert"]>;
        Relationships: [];
      };
      show_bands: {
        Row: {
          show_id: string;
          band_id: string;
          position: number;
        };
        Insert: {
          show_id: string;
          band_id: string;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["show_bands"]["Insert"]>;
        Relationships: [];
      };
      setlists: {
        Row: {
          id: string;
          show_id: string;
          band_id: string;
          source: string | null;
          external_id: string | null;
          created_by: string | null;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          show_id: string;
          band_id: string;
          source?: string | null;
          external_id?: string | null;
          created_by?: string | null;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["setlists"]["Insert"]>;
        Relationships: [];
      };
      setlist_songs: {
        Row: {
          id: string;
          setlist_id: string;
          set_number: number;
          position: number;
          title: string;
          duration_seconds: number | null;
        };
        Insert: {
          id?: string;
          setlist_id: string;
          set_number?: number;
          position: number;
          title: string;
          duration_seconds?: number | null;
        };
        Update: Partial<Database["public"]["Tables"]["setlist_songs"]["Insert"]>;
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          show_id: string;
          user_id: string;
          content: string;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          show_id: string;
          user_id: string;
          content?: string;
          updated_at?: Timestamp;
        };
        Update: Partial<Database["public"]["Tables"]["notes"]["Insert"]>;
        Relationships: [];
      };
      note_tagged_friends: {
        Row: {
          id: string;
          note_id: string;
          user_id: string | null;
          display_name: string | null;
        };
        Insert: {
          id?: string;
          note_id: string;
          user_id?: string | null;
          display_name?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["note_tagged_friends"]["Insert"]>;
        Relationships: [];
      };
      show_links: {
        Row: {
          id: string;
          show_id: string;
          kind: "reddit" | "nugs" | "billybase" | "bmfsdb" | "other";
          url: string;
          label: string | null;
        };
        Insert: {
          id?: string;
          show_id: string;
          kind: "reddit" | "nugs" | "billybase" | "bmfsdb" | "other";
          url: string;
          label?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["show_links"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

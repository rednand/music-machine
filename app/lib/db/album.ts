import type { SupabaseLike } from "./supabase-like";

export interface AlbumRow {
  id: string;
  artist_id: string;
  title: string;
  slug: string;
  release_date: string;
  created_at?: string;
  genre?: string;
  label?: string;
  duration_seconds?: number;
  track_count?: number;
  cover_art_url?: string;
}

export interface CreateAlbumInput {
  artist_id: string;
  title: string;
  slug: string;
  release_date: string;
  genre?: string;
  label?: string;
  duration_seconds?: number;
  track_count?: number;
  cover_art_url?: string;
}

export interface TrackRow {
  id: string;
  album_id: string;
  title: string;
  track_number?: number;
  duration_seconds?: number;
}

export interface CreditRow {
  id: string;
  album_id?: string;
  track_id?: string;
  person_name: string;
  role: string;
  source_id: string;
}

export interface ArtistRow {
  id: string;
  name: string;
  slug: string;
}

export interface CreateArtistInput {
  name: string;
  slug: string;
}

export function createAlbumRepository(supabase: SupabaseLike) {
  return {
    async createAlbum(input: CreateAlbumInput): Promise<AlbumRow> {
      const { data } = await supabase.from<AlbumRow>("albums").insert(input).select().single();
      return data as AlbumRow;
    },

    async findAlbumById(id: string): Promise<AlbumRow | null> {
      const { data } = await supabase.from<AlbumRow>("albums").select("*").eq("id", id).maybeSingle();
      return data;
    },

    async searchAlbums(query: string): Promise<AlbumRow[]> {
      const { data } = await supabase.from<AlbumRow>("albums").select("*").ilike("title", `%${query}%`);
      return data ?? [];
    },

    async createTrack(input: Omit<TrackRow, "id">): Promise<TrackRow> {
      const { data } = await supabase.from<TrackRow>("tracks").insert(input).select().single();
      return data as TrackRow;
    },

    async createCredit(input: Omit<CreditRow, "id">): Promise<CreditRow> {
      const { data } = await supabase.from<CreditRow>("credits").insert(input).select().single();
      return data as CreditRow;
    },

    async findCreditsByAlbumId(albumId: string): Promise<CreditRow[]> {
      const { data } = await supabase.from<CreditRow>("credits").select("*").eq("album_id", albumId);
      return data ?? [];
    },

    async searchArtists(query: string): Promise<ArtistRow[]> {
      const { data } = await supabase.from<ArtistRow>("artists").select("*").ilike("name", `%${query}%`);
      return data ?? [];
    },

    async findArtistById(id: string): Promise<ArtistRow | null> {
      const { data } = await supabase.from<ArtistRow>("artists").select("*").eq("id", id).maybeSingle();
      return data;
    },

    async findArtistByName(name: string): Promise<ArtistRow | null> {
      const { data } = await supabase.from<ArtistRow>("artists").select("*").eq("name", name).maybeSingle();
      return data;
    },

    async createArtist(input: CreateArtistInput): Promise<ArtistRow> {
      const { data } = await supabase.from<ArtistRow>("artists").insert(input).select().single();
      return data as ArtistRow;
    },

    async findAlbumBySlug(slug: string): Promise<AlbumRow | null> {
      const { data } = await supabase.from<AlbumRow>("albums").select("*").eq("slug", slug).maybeSingle();
      return data;
    },

    async findAllAlbums(): Promise<AlbumRow[]> {
      const { data } = await supabase.from<AlbumRow>("albums").select("*");
      return data ?? [];
    },

    async findAlbumsOrderedByCreatedAt(): Promise<AlbumRow[]> {
      const { data } = await supabase.from<AlbumRow>("albums").select("*");
      const rows = data ?? [];
      return [...rows].sort((a, b) => {
        const createdCompare = (b.created_at ?? "").localeCompare(a.created_at ?? "");
        return createdCompare !== 0 ? createdCompare : a.title.localeCompare(b.title);
      });
    },

    async findAlbumsByArtistId(artistId: string): Promise<AlbumRow[]> {
      const { data } = await supabase
        .from<AlbumRow>("albums")
        .select("*")
        .eq("artist_id", artistId)
        .order("release_date", { ascending: true });
      return data ?? [];
    },

    async findAllArtists(): Promise<ArtistRow[]> {
      const { data } = await supabase.from<ArtistRow>("artists").select("*").order("name", { ascending: true });
      return data ?? [];
    },

    async findTracksByAlbumId(albumId: string): Promise<TrackRow[]> {
      const { data } = await supabase
        .from<TrackRow>("tracks")
        .select("*")
        .eq("album_id", albumId)
        .order("track_number", { ascending: true });
      return data ?? [];
    },

    async findTracksByTitle(query: string): Promise<TrackRow[]> {
      const { data } = await supabase.from<TrackRow>("tracks").select("*").ilike("title", `%${query}%`);
      return data ?? [];
    }
  };
}

export type AlbumRepository = ReturnType<typeof createAlbumRepository>;

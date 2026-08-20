import { describe, expect, it } from "vitest";
import type {
  CatalogProviderAdapter,
  CreditsProviderAdapter,
  EncyclopediaProviderAdapter,
  PopularityProviderAdapter
} from "./provider.interface";

describe("provider interfaces", () => {
  it("a mock catalog adapter conforms to CatalogProviderAdapter", async () => {
    const adapter: CatalogProviderAdapter = {
      providerName: "mock-catalog",
      async searchAlbum() {
        return [];
      },
      async searchByText() {
        return [];
      },
      async fetchTracks() {
        return [];
      },
      async searchArtist() {
        return null;
      },
      async fetchArtistAlbums() {
        return [];
      }
    };

    expect(adapter.providerName).toBe("mock-catalog");
    expect(await adapter.searchAlbum({ artistName: "x", albumTitle: "y" })).toEqual([]);
    expect(await adapter.searchByText("x y")).toEqual([]);
    expect(await adapter.fetchTracks("album-id")).toEqual([]);
    expect(await adapter.searchArtist("x")).toBeNull();
    expect(await adapter.fetchArtistAlbums("artist-id")).toEqual([]);
  });

  it("a mock credits adapter conforms to CreditsProviderAdapter", async () => {
    const adapter: CreditsProviderAdapter = {
      providerName: "mock-credits",
      async fetchCredits() {
        return [];
      },
      async fetchTracks() {
        return [];
      }
    };

    expect(await adapter.fetchCredits({ artistName: "x", albumTitle: "y" })).toEqual([]);
    expect(await adapter.fetchTracks({ artistName: "x", albumTitle: "y" })).toEqual([]);
  });

  it("a mock popularity adapter conforms to PopularityProviderAdapter", async () => {
    const adapter: PopularityProviderAdapter = {
      providerName: "mock-popularity",
      async fetchTags() {
        return ["funk"];
      }
    };

    expect(await adapter.fetchTags({ artistName: "x", albumTitle: "y" })).toEqual(["funk"]);
  });

  it("a mock encyclopedia adapter conforms to EncyclopediaProviderAdapter", async () => {
    const adapter: EncyclopediaProviderAdapter = {
      providerName: "mock-encyclopedia",
      async fetchContextFacts() {
        return [];
      },
      async fetchPerformanceRecords() {
        return [];
      },
      async fetchArtistProfile() {
        return { summary: null, influencedBy: [], influenced: [] };
      }
    };

    expect(await adapter.fetchContextFacts({ artistName: "x", albumTitle: "y" })).toEqual([]);
    expect(await adapter.fetchPerformanceRecords({ artistName: "x", albumTitle: "y" })).toEqual([]);
    expect(await adapter.fetchArtistProfile("x")).toEqual({ summary: null, influencedBy: [], influenced: [] });
  });
});

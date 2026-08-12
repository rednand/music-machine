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
      }
    };

    expect(adapter.providerName).toBe("mock-catalog");
    expect(await adapter.searchAlbum({ artistName: "x", albumTitle: "y" })).toEqual([]);
    expect(await adapter.searchByText("x y")).toEqual([]);
  });

  it("a mock credits adapter conforms to CreditsProviderAdapter", async () => {
    const adapter: CreditsProviderAdapter = {
      providerName: "mock-credits",
      async fetchCredits() {
        return [];
      }
    };

    expect(await adapter.fetchCredits({ artistName: "x", albumTitle: "y" })).toEqual([]);
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
      }
    };

    expect(await adapter.fetchContextFacts({ artistName: "x", albumTitle: "y" })).toEqual([]);
    expect(await adapter.fetchPerformanceRecords({ artistName: "x", albumTitle: "y" })).toEqual([]);
  });
});

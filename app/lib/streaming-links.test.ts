import { describe, expect, it } from "vitest";
import { buildStreamingLinks } from "./streaming-links";

describe("buildStreamingLinks", () => {
  it("builds a search link per platform combining artist and title", () => {
    const links = buildStreamingLinks("Nevermind", "Nirvana");

    expect(links).toEqual([
      { label: "Deezer", url: "https://www.deezer.com/search/Nirvana%20Nevermind" },
      { label: "Spotify", url: "https://open.spotify.com/search/Nirvana%20Nevermind" },
      { label: "YouTube Music", url: "https://music.youtube.com/search?q=Nirvana%20Nevermind" },
      { label: "Apple Music", url: "https://music.apple.com/search?term=Nirvana%20Nevermind" }
    ]);
  });

  it("encodes special characters in the title or artist name", () => {
    const links = buildStreamingLinks("¿Qué?", "Café Tacvba");

    links.forEach((link) => {
      expect(link.url).not.toContain("¿");
      expect(link.url).not.toContain(" ");
      expect(link.url).toContain(encodeURIComponent("Café Tacvba ¿Qué?"));
    });
  });
});

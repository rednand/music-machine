export interface StreamingLink {
  label: string;
  url: string;
}

export function buildStreamingLinks(title: string, artistName: string): StreamingLink[] {
  const query = encodeURIComponent(`${artistName} ${title}`);

  return [
    { label: "Deezer", url: `https://www.deezer.com/search/${query}` },
    { label: "Spotify", url: `https://open.spotify.com/search/${query}` },
    { label: "YouTube Music", url: `https://music.youtube.com/search?q=${query}` },
    { label: "Apple Music", url: `https://music.apple.com/search?term=${query}` }
  ];
}

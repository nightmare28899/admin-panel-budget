/** Builds a YouTube search link for how to prepare a recipe. No API key or storage needed. */
export function youtubeSearchUrl(title: string): string {
  const query = `${title.replace(/\s+/g, " ").trim()} receta`;
  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set("search_query", query);
  return url.toString();
}

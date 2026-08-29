const RELEASE = Object.freeze({
  commit: "development",
  deployedAt: null,
});

export async function onRequestGet() {
  return new Response(JSON.stringify(RELEASE), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate",
      pragma: "no-cache",
      "x-robots-tag": "noindex",
    },
  });
}

import { fetchReleases } from "~/lib/changelog"

const ok = "public, max-age=1, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400"
const error = "public, max-age=1, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400"

export async function GET() {
  const releases = await fetchReleases()

  if (releases.length === 0) {
    return new Response(JSON.stringify({ releases: [] }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": error,
      },
    })
  }

  return new Response(JSON.stringify({ releases }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": ok,
    },
  })
}

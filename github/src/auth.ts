import { getIDToken } from "@actions/core"
import { lazy } from "./lazy"
import { Mock } from "./mock"
import { Context } from "./context"

export namespace Auth {
  let init = false

  export const state = lazy(async () => {
    init = true

    const envToken = process.env["TOKEN"]
    if (envToken) return { token: envToken }

    let response
    if (Mock.isMock()) {
      response = await fetch("https://api.opencode.ai/exchange_github_app_token_with_pat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Mock.token()}`,
        },
        body: JSON.stringify({ owner: Context.repo().owner, repo: Context.repo().repo }),
      })
    } else {
      const oidcToken = await getIDToken("opencode-github-action")
      response = await fetch("https://api.opencode.ai/exchange_github_app_token", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${oidcToken}`,
        },
      })
    }

    if (!response.ok) {
      const responseJson = (await response.json()) as { error?: string }
      throw new Error(`App token exchange failed: ${response.status} ${response.statusText} - ${responseJson.error}`)
    }

    const responseJson = (await response.json()) as { token: string }

    return {
      token: responseJson.token,
    }
  })

  export async function token() {
    const { token } = await state()
    return token
  }

  export async function revoke() {
    console.log("Revoking app token...")

    if (!init) return

    const { token } = await state()

    await fetch("https://api.github.com/installation/token", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
  }
}

import * as github from "@actions/github"
import type { PullRequest } from "@octokit/webhooks-types"
import { lazy } from "./lazy"
import { Mock } from "./mock"

export namespace Context {
  export const state = lazy(() => {
    return {
      context: Mock.context() ?? github.context,
    }
  })

  export function assertEventName(...events: string[]) {
    if (!events.includes(eventName())) {
      throw new Error(`Unsupported event type: ${eventName()}`)
    }
  }

  export function eventName() {
    return state().context.eventName
  }

  export function actor() {
    return state().context.actor
  }

  export function repo() {
    return state().context.repo
  }

  export function payload<T>() {
    return state().context.payload as T
  }

  export function payloadPullRequest() {
    const pr = Context.payload<any>().pull_request
    if (!pr) throw new Error("Pull request not found in context payload")
    return pr as PullRequest
  }
}

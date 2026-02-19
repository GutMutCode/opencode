import { Hono } from "hono"
import { describeRoute, validator, resolver } from "hono-openapi"
import z from "zod"
import { Bus } from "@/bus"
import { Sampling } from "@/mcp/sampling"
import { errors } from "../error"
import { lazy } from "../../util/lazy"

export const SamplingRoutes = lazy(() =>
  new Hono().post(
    "/respond",
    describeRoute({
      summary: "Respond to sampling approval request",
      description: "Approve or deny a sampling request from an MCP server.",
      operationId: "sampling.respond",
      responses: {
        200: {
          description: "Response processed successfully",
          content: {
            "application/json": {
              schema: resolver(z.boolean()),
            },
          },
        },
        ...errors(400),
      },
    }),
    validator(
      "json",
      z.object({
        requestId: z.string(),
        approved: z.boolean(),
      }),
    ),
    async (c) => {
      const { requestId, approved } = c.req.valid("json")
      await Bus.publish(Sampling.ApprovalResponse, {
        requestId,
        approved,
      })
      return c.json(true)
    },
  ),
)

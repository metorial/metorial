import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { resolveWorkspaceId, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listBotsTool = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `List all bots in a Botpress workspace. Returns bot names, IDs, deployment status, and timestamps. Supports pagination for workspaces with many bots. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token for fetching the next page of results'),
      sortField: z
        .enum(['createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort results by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      bots: z.array(
        z.object({
          botId: z.string(),
          name: z.string().optional(),
          createdAt: z.string(),
          updatedAt: z.string(),
          deployedAt: z.string().optional()
        })
      ),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: resolveWorkspaceId(ctx.input.workspaceId, ctx.config)
    });

    let result = await client.listBots({
      nextToken: ctx.input.nextToken,
      sortField: ctx.input.sortField,
      sortDirection: ctx.input.sortDirection
    });

    let bots = (result.bots || []).map((b: Record<string, unknown>) => ({
      botId: b.id as string,
      name: b.name as string | undefined,
      createdAt: b.createdAt as string,
      updatedAt: b.updatedAt as string,
      deployedAt: b.deployedAt as string | undefined
    }));

    return {
      output: {
        bots,
        nextToken: result.meta?.nextToken
      },
      message: `Found **${bots.length}** bot(s).${result.meta?.nextToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();

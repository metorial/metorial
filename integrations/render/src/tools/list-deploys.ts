import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let listDeploys = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deploys',
  description: `List recent deployments for a Render service. Shows deployment history including status, commit, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)'),
      limit: z.number().optional().describe('Maximum number of results (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      deploys: z.array(
        z.object({
          deployId: z.string().describe('Deployment ID'),
          status: z.string().optional().describe('Deployment status'),
          commitId: z.string().optional().describe('Commit ID'),
          commitMessage: z.string().optional().describe('Commit message'),
          createdAt: z.string().optional().describe('Deploy creation timestamp'),
          updatedAt: z.string().optional().describe('Deploy update timestamp'),
          finishedAt: z.string().optional().describe('Deploy completion timestamp')
        })
      ),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.cursor) params.cursor = ctx.input.cursor;

    let data = await client.listDeploys(ctx.input.serviceId, params);

    let lastCursor: string | undefined;
    let deploys = (data as any[]).map((item: any) => {
      lastCursor = item.cursor;
      let d = item.deploy;
      return {
        deployId: d.id,
        status: d.status,
        commitId: d.commit?.id,
        commitMessage: d.commit?.message,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        finishedAt: d.finishedAt
      };
    });

    return {
      output: { deploys, cursor: lastCursor },
      message: `Found **${deploys.length}** deployment(s) for service \`${ctx.input.serviceId}\`.${deploys
        .slice(0, 5)
        .map(
          d =>
            `\n- \`${d.deployId}\` — ${d.status || 'unknown'}${d.commitMessage ? ` — ${d.commitMessage.slice(0, 60)}` : ''}`
        )
        .join('')}`
    };
  })
  .build();

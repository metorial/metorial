import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPods = SlateTool.create(spec, {
  name: 'List Pods',
  key: 'list_pods',
  description: `List all pods in the account. Pods are multi-tenant containers that group inboxes and domains for isolated email management. A default pod is created with every account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum pods per page'),
      pageToken: z.string().optional().describe('Pagination cursor from a previous response'),
      ascending: z.boolean().optional().describe('Sort oldest first when true')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of pods in this page'),
      nextPageToken: z.string().optional().describe('Cursor for the next page'),
      pods: z
        .array(
          z.object({
            podId: z.string().describe('Pod identifier'),
            name: z.string().describe('Pod name'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('Array of pods')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.listPods({
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      ascending: ctx.input.ascending
    });

    let pods = result.pods.map(p => ({
      podId: p.pod_id,
      name: p.name,
      createdAt: p.created_at
    }));

    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        pods
      },
      message: `Found **${result.count}** pod(s).`
    };
  })
  .build();

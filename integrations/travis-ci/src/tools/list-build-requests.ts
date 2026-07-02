import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let listBuildRequests = SlateTool.create(spec, {
  name: 'List Build Requests',
  key: 'list_build_requests',
  description: `List the history of build requests for a repository, including those triggered by commits, pull requests, API calls, or cron jobs. Useful for auditing build activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug (e.g. "owner/repo") or numeric ID.'),
      limit: z.number().optional().describe('Maximum number of requests to return.'),
      offset: z.number().optional().describe('Number of requests to skip for pagination.')
    })
  )
  .output(
    z.object({
      requests: z.array(
        z.object({
          requestId: z.number().describe('Request ID'),
          state: z.string().optional().describe('Request state'),
          result: z.string().nullable().optional().describe('Request result'),
          message: z.string().nullable().optional().describe('Request message'),
          branchName: z.string().optional().describe('Branch name'),
          eventType: z.string().optional().describe('Event type that triggered the request'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          buildIds: z.array(z.number()).optional().describe('Associated build IDs')
        })
      ),
      totalCount: z.number().optional().describe('Total number of requests')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listRequests(ctx.input.repoSlugOrId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let requests = (result.requests || []).map((req: any) => ({
      requestId: req.id,
      state: req.state,
      result: req.result ?? null,
      message: req.message ?? null,
      branchName: req.branch_name,
      eventType: req.event_type,
      createdAt: req.created_at,
      buildIds: (req.builds || []).map((b: any) => b.id)
    }));

    return {
      output: {
        requests,
        totalCount: result['@pagination']?.count
      },
      message: `Found **${requests.length}** build requests for **${ctx.input.repoSlugOrId}**.`
    };
  })
  .build();

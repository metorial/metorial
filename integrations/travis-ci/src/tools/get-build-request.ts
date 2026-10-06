import { SlateTool } from 'slates';
import { z } from 'zod';
import { legacyBaseUrl, TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export const getBuildRequest = SlateTool.create(spec, {
  name: 'Get Build Request',
  key: 'get_build_request',
  description:
    'Read an asynchronous build request and discover its resulting build IDs, processing state, and result.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      repoSlugOrId: z.string().describe('Repository slug or numeric ID'),
      requestId: z
        .string()
        .describe('Numeric request ID returned by trigger_build or list_build_requests')
    })
  )
  .output(
    z.object({
      requestId: z.number(),
      state: z.string().optional(),
      result: z.string().nullable().optional(),
      message: z.string().nullable().optional(),
      branchName: z.string().optional(),
      eventType: z.string().optional(),
      createdAt: z.string().optional(),
      buildIds: z.array(z.number())
    })
  )
  .handleInvocation(async ctx => {
    const req = await new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? legacyBaseUrl(ctx.config)
    }).getRequest(ctx.input.repoSlugOrId, ctx.input.requestId);
    return {
      output: {
        requestId: req.id,
        state: req.state,
        result: req.result ?? null,
        message: req.message ?? null,
        branchName: req.branch_name,
        eventType: req.event_type,
        createdAt: req.created_at,
        buildIds: (req.builds ?? []).map(build => build.id)
      },
      message: `Request **${req.id}** is **${req.state ?? 'pending'}**.`
    };
  })
  .build();

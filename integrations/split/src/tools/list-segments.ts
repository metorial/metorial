import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List all segments in a Split workspace. Returns segment names, descriptions, and associated traffic types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to the configured default.')
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentName: z.string(),
          description: z.string().nullable().optional(),
          trafficTypeName: z.string().optional(),
          trafficTypeId: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw new Error('workspaceId is required. Set it in config or pass it as input.');
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listSegments(wsId);

    let segments = result.objects.map(s => ({
      segmentName: s.name,
      description: s.description ?? null,
      trafficTypeName: s.trafficType?.name,
      trafficTypeId: s.trafficType?.id
    }));

    return {
      output: { segments, totalCount: result.totalCount },
      message: `Found **${result.totalCount}** segments.`
    };
  })
  .build();

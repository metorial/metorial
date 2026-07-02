import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let segmentOutputSchema = z.object({
  segmentUuid: z.string().describe('Unique identifier of the segment'),
  name: z.string().describe('Segment name'),
  emailListUuid: z.string().describe('UUID of the email list'),
  allPositiveTagsRequired: z.boolean().describe('Whether all positive tags must match'),
  allNegativeTagsRequired: z.boolean().describe('Whether all negative tags must match'),
  positiveTags: z.array(z.string()).describe('Tags that subscribers must have'),
  negativeTags: z.array(z.string()).describe('Tags that subscribers must not have'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageSegment = SlateTool.create(spec, {
  name: 'Manage Segment',
  key: 'manage_segment',
  description: `List, create, update, or delete segments on an email list. Segments allow targeting subsets of subscribers based on combinations of required and excluded tags.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      emailListUuid: z.string().describe('UUID of the email list'),
      segmentUuid: z
        .string()
        .optional()
        .describe('UUID of the segment (required for update, delete)'),
      name: z.string().optional().describe('Segment name (required for create and update)'),
      allPositiveTagsRequired: z
        .boolean()
        .optional()
        .describe('Whether all positive tags must match (default false)'),
      allNegativeTagsRequired: z
        .boolean()
        .optional()
        .describe('Whether all negative tags must match (default false)'),
      positiveTags: z.array(z.string()).optional().describe('Tags that subscribers must have'),
      negativeTags: z
        .array(z.string())
        .optional()
        .describe('Tags that subscribers must not have'),
      page: z.number().optional().describe('Page number for pagination (list only)')
    })
  )
  .output(
    z.object({
      segment: segmentOutputSchema
        .nullable()
        .describe('Single segment result (for create, update)'),
      segments: z
        .array(segmentOutputSchema)
        .nullable()
        .describe('List of segments (for list action)'),
      totalCount: z.number().nullable().describe('Total count of segments (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listSegments(ctx.input.emailListUuid, {
        page: ctx.input.page
      });
      let segments = (result.data || []).map(mapSegment);
      return {
        output: { segment: null, segments, totalCount: result.meta?.total ?? segments.length },
        message: `Found **${segments.length}** segment(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.segmentUuid) throw new Error('segmentUuid is required for delete');
      await client.deleteSegment(ctx.input.emailListUuid, ctx.input.segmentUuid);
      return {
        output: { segment: null, segments: null, totalCount: null },
        message: `Segment **${ctx.input.segmentUuid}** has been deleted.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create');
      let result = await client.createSegment(ctx.input.emailListUuid, {
        name: ctx.input.name,
        all_positive_tags_required: ctx.input.allPositiveTagsRequired,
        all_negative_tags_required: ctx.input.allNegativeTagsRequired,
        positive_tags: ctx.input.positiveTags,
        negative_tags: ctx.input.negativeTags
      });
      return {
        output: { segment: mapSegment(result), segments: null, totalCount: null },
        message: `Segment **${result.name}** has been created.`
      };
    }

    // update
    if (!ctx.input.segmentUuid) throw new Error('segmentUuid is required for update');
    if (!ctx.input.name) throw new Error('name is required for update');

    let result = await client.updateSegment(ctx.input.emailListUuid, ctx.input.segmentUuid, {
      name: ctx.input.name,
      all_positive_tags_required: ctx.input.allPositiveTagsRequired,
      all_negative_tags_required: ctx.input.allNegativeTagsRequired,
      positive_tags: ctx.input.positiveTags,
      negative_tags: ctx.input.negativeTags
    });

    return {
      output: { segment: mapSegment(result), segments: null, totalCount: null },
      message: `Segment **${result.name}** has been updated.`
    };
  });

let mapSegment = (s: any) => ({
  segmentUuid: s.uuid,
  name: s.name,
  emailListUuid: s.email_list_uuid,
  allPositiveTagsRequired: s.all_positive_tags_required ?? false,
  allNegativeTagsRequired: s.all_negative_tags_required ?? false,
  positiveTags: s.positive_tags ?? [],
  negativeTags: s.negative_tags ?? [],
  createdAt: s.created_at,
  updatedAt: s.updated_at
});

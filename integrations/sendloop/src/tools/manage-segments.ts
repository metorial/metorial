import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let manageSegments = SlateTool.create(spec, {
  name: 'Manage Segments',
  key: 'manage_segments',
  description: `Create, list, or delete audience segments within a subscriber list. Segments allow you to target specific groups of subscribers based on rules such as subscription date, behavior, or custom field values.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'delete']).describe('Operation to perform'),
      listId: z.string().describe('ID of the subscriber list'),
      segmentId: z.string().optional().describe('Segment ID (required for get and delete)'),
      segmentName: z
        .string()
        .optional()
        .describe('Name for the new segment (required for create)'),
      rules: z
        .string()
        .optional()
        .describe('Segment rules definition (JSON string for create)')
    })
  )
  .output(
    z.object({
      segments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of segment objects (for list/get)'),
      segmentId: z.string().optional().describe('ID of the created or deleted segment'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, listId, segmentId, segmentName, rules } = ctx.input;

    if (action === 'list') {
      let result = await client.getSegments(listId);
      let segments = result.Segments || result.Data || [];
      if (!Array.isArray(segments)) segments = [segments];

      return {
        output: { segments, success: true },
        message: `Retrieved **${segments.length}** segment(s) for list **${listId}**.`
      };
    }

    if (action === 'get') {
      if (!segmentId) throw new Error('Segment ID is required for get action');
      let result = await client.getSegment(listId, segmentId);
      let segment = result.Segment || result;

      return {
        output: { segments: [segment], success: true },
        message: `Retrieved segment **${segmentId}** from list **${listId}**.`
      };
    }

    if (action === 'create') {
      if (!segmentName) throw new Error('Segment name is required for create action');
      let result = await client.createSegment(listId, { segmentName, rules });

      return {
        output: {
          segmentId: String(result.SegmentID || result.SegmentId || ''),
          success: true
        },
        message: `Successfully created segment **${segmentName}** in list **${listId}**.`
      };
    }

    if (action === 'delete') {
      if (!segmentId) throw new Error('Segment ID is required for delete action');
      await client.deleteSegment(listId, segmentId);

      return {
        output: { segmentId, success: true },
        message: `Successfully deleted segment **${segmentId}** from list **${listId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

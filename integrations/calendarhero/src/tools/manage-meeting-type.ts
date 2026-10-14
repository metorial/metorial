import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMeetingType = SlateTool.create(spec, {
  name: 'Manage Meeting Type',
  key: 'manage_meeting_type',
  description:
    'Create or delete a CalendarHero meeting type. Use list_meeting_types to find configured types before deleting one.',
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete'])
        .describe('Whether to create or delete a meeting type'),
      type: z
        .string()
        .describe(
          'Meeting type name or slug. Call list_meeting_types to discover existing types.'
        )
    })
  )
  .output(
    z.object({
      type: z.string().describe('Meeting type name or slug'),
      success: z.boolean().describe('Whether the operation succeeded'),
      raw: z.any().optional().describe('Full meeting type response')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.type.trim()) {
      throw createApiServiceError('Provide a non-empty meeting type name or slug.');
    }
    let client = new Client(ctx.auth.token);
    let result =
      ctx.input.action === 'create'
        ? await client.createMeetingType(ctx.input.type)
        : await client.deleteMeetingType(ctx.input.type);
    return {
      output: { type: ctx.input.type, success: true, raw: result },
      message: `Meeting type **${ctx.input.type}** ${ctx.input.action === 'create' ? 'created' : 'deleted'}.`
    };
  })
  .build();

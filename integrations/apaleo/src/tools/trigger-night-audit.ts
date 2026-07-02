import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let triggerNightAudit = SlateTool.create(spec, {
  name: 'Trigger Night Audit',
  key: 'trigger_night_audit',
  description: `Trigger a night audit for a property. Night audit closes the current business day and processes end-of-day operations including posting daily charges, updating reservation statuses, and advancing the business date.`,
  constraints: [
    'Night audit can only be triggered once per business day.',
    'All in-house reservations must have balanced folios before running.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      propertyId: z
        .string()
        .optional()
        .describe('Property ID (uses default from config if not set)')
    })
  )
  .output(
    z.object({
      propertyId: z.string().describe('Property ID'),
      triggered: z.boolean().describe('Whether the night audit was triggered')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);
    let propertyId = ctx.input.propertyId || ctx.config.propertyId;
    if (!propertyId)
      throw new Error('propertyId is required — set it in config or provide it as input');

    await client.triggerNightAudit(propertyId);

    return {
      output: {
        propertyId,
        triggered: true
      },
      message: `Night audit triggered for property **${propertyId}**.`
    };
  })
  .build();

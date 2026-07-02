import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let updateCheckin = SlateTool.create(spec, {
  name: 'Update Check-in',
  key: 'update_checkin',
  description: `Update an existing check-in's configuration including name, scheduling, anonymity, active status, and other settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      checkinUuid: z.string().describe('UUID of the check-in to update'),
      name: z.string().optional().describe('New name for the check-in'),
      isActive: z.boolean().optional().describe('Whether the check-in should be active'),
      isAnonymous: z.boolean().optional().describe('Whether responses should be anonymous'),
      frequency: z.string().optional().describe('Scheduling frequency'),
      daysOfWeek: z
        .array(z.number())
        .optional()
        .describe('Days of the week (0=Sunday, 6=Saturday)'),
      triggerTime: z.string().optional().describe('Trigger time (HH:MM format)'),
      isTriggerBased: z.boolean().optional().describe('If true, the check-in is manual-only')
    })
  )
  .output(
    z.object({
      checkinUuid: z.string().describe('UUID of the updated check-in'),
      name: z.string().describe('Name of the updated check-in'),
      isActive: z.boolean().describe('Whether the check-in is active'),
      raw: z.any().describe('Full updated check-in object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.isActive !== undefined) body.is_active = ctx.input.isActive;
    if (ctx.input.isAnonymous !== undefined) body.is_anonymous = ctx.input.isAnonymous;
    if (ctx.input.frequency !== undefined) body.frequency = ctx.input.frequency;
    if (ctx.input.daysOfWeek !== undefined) body.days_of_week = ctx.input.daysOfWeek;
    if (ctx.input.triggerTime !== undefined) body.trigger_time = ctx.input.triggerTime;
    if (ctx.input.isTriggerBased !== undefined)
      body.is_trigger_based = ctx.input.isTriggerBased;

    let checkin = await client.updateCheckin(ctx.input.checkinUuid, body);

    return {
      output: {
        checkinUuid: checkin.uuid,
        name: checkin.name,
        isActive: checkin.is_active ?? checkin.active ?? true,
        raw: checkin
      },
      message: `Updated check-in **${checkin.name}**.`
    };
  })
  .build();

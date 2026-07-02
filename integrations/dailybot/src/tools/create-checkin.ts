import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let createCheckin = SlateTool.create(spec, {
  name: 'Create Check-in',
  key: 'create_checkin',
  description: `Create a new check-in (async stand-up or recurring survey) based on a template. Configure scheduling, anonymity, reminders, and reporting channel.`,
  instructions: [
    'A template UUID is required. Use the List Templates tool to find available templates.',
    'Frequency options typically include: "every_day", "weekdays", "weekly", or specific day configurations.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the check-in'),
      templateUuid: z.string().describe('UUID of the template to use for questions'),
      isActive: z
        .boolean()
        .optional()
        .describe('Whether the check-in should be active immediately'),
      isAnonymous: z.boolean().optional().describe('Whether responses should be anonymous'),
      frequency: z
        .string()
        .optional()
        .describe('Scheduling frequency (e.g., "every_day", "weekdays", "weekly")'),
      daysOfWeek: z
        .array(z.number())
        .optional()
        .describe('Days of the week for the check-in (0=Sunday, 6=Saturday)'),
      triggerTime: z
        .string()
        .optional()
        .describe('Time to trigger the check-in (HH:MM format)'),
      isTriggerBased: z
        .boolean()
        .optional()
        .describe('If true, the check-in is manual-only (no automatic scheduling)')
    })
  )
  .output(
    z.object({
      checkinUuid: z.string().describe('UUID of the created check-in'),
      name: z.string().describe('Name of the created check-in'),
      isActive: z.boolean().describe('Whether the check-in is active'),
      raw: z.any().describe('Full check-in object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      template_uuid: ctx.input.templateUuid
    };
    if (ctx.input.isActive !== undefined) body.is_active = ctx.input.isActive;
    if (ctx.input.isAnonymous !== undefined) body.is_anonymous = ctx.input.isAnonymous;
    if (ctx.input.frequency) body.frequency = ctx.input.frequency;
    if (ctx.input.daysOfWeek) body.days_of_week = ctx.input.daysOfWeek;
    if (ctx.input.triggerTime) body.trigger_time = ctx.input.triggerTime;
    if (ctx.input.isTriggerBased !== undefined)
      body.is_trigger_based = ctx.input.isTriggerBased;

    let checkin = await client.createCheckin(body);

    return {
      output: {
        checkinUuid: checkin.uuid,
        name: checkin.name,
        isActive: checkin.is_active ?? checkin.active ?? true,
        raw: checkin
      },
      message: `Created check-in **${checkin.name}** (${checkin.uuid}).`
    };
  })
  .build();

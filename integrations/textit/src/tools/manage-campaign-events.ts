import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaignEvents = SlateTool.create(spec, {
  name: 'Manage Campaign Events',
  key: 'manage_campaign_events',
  description: `Create, update, or delete campaign events. Campaign events define scheduled actions (sending a message or starting a flow) relative to a contact date field. Each event belongs to a campaign.`,
  instructions: [
    'Each event must have either a message or a flow, but not both.',
    'The offset and unit define when the event fires relative to the date field (e.g., 7 days after registration).',
    'Set deliveryHour to -1 to match the hour from the contact date field.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      eventUuid: z
        .string()
        .optional()
        .describe('UUID of the campaign event (required for update/delete)'),
      campaignUuid: z
        .string()
        .optional()
        .describe('UUID of the campaign (required for create)'),
      relativeTo: z
        .string()
        .optional()
        .describe('Key of the contact date field the event is relative to'),
      offset: z
        .number()
        .optional()
        .describe('Offset from the date field (positive or negative integer)'),
      unit: z
        .enum(['minutes', 'hours', 'days', 'weeks'])
        .optional()
        .describe('Unit of the offset'),
      deliveryHour: z
        .number()
        .optional()
        .describe('Hour of the day to deliver (0-24, or -1 to match contact field)'),
      message: z
        .record(z.string(), z.string())
        .optional()
        .describe('Message translations by language code (mutually exclusive with flowUuid)'),
      flowUuid: z
        .string()
        .optional()
        .describe('UUID of the flow to start (mutually exclusive with message)')
    })
  )
  .output(
    z.object({
      eventUuid: z.string().optional().describe('UUID of the campaign event'),
      campaignUuid: z.string().optional(),
      campaignName: z.string().optional(),
      relativeTo: z.object({ key: z.string(), name: z.string() }).optional(),
      offset: z.number().optional(),
      unit: z.string().optional(),
      deliveryHour: z.number().optional(),
      message: z.record(z.string(), z.string()).nullable().optional(),
      flow: z.object({ flowUuid: z.string(), name: z.string() }).nullable().optional(),
      createdOn: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      await client.deleteCampaignEvent(ctx.input.eventUuid!);
      return {
        output: {},
        message: `Campaign event deleted successfully.`
      };
    }

    let event: any;
    if (ctx.input.action === 'create') {
      event = await client.createCampaignEvent({
        campaign: ctx.input.campaignUuid!,
        relative_to: ctx.input.relativeTo!,
        offset: ctx.input.offset!,
        unit: ctx.input.unit!,
        delivery_hour: ctx.input.deliveryHour!,
        message: ctx.input.message,
        flow: ctx.input.flowUuid
      });
    } else {
      event = await client.updateCampaignEvent(ctx.input.eventUuid!, {
        relative_to: ctx.input.relativeTo,
        offset: ctx.input.offset,
        unit: ctx.input.unit,
        delivery_hour: ctx.input.deliveryHour,
        message: ctx.input.message,
        flow: ctx.input.flowUuid
      });
    }

    return {
      output: {
        eventUuid: event.uuid,
        campaignUuid: event.campaign.uuid,
        campaignName: event.campaign.name,
        relativeTo: event.relative_to,
        offset: event.offset,
        unit: event.unit,
        deliveryHour: event.delivery_hour,
        message: event.message,
        flow: event.flow ? { flowUuid: event.flow.uuid, name: event.flow.name } : null,
        createdOn: event.created_on
      },
      message: `Campaign event **${event.uuid}** ${ctx.input.action === 'create' ? 'created' : 'updated'} successfully.`
    };
  })
  .build();

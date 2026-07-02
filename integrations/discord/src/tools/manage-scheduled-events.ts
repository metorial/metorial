import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let scheduledEventSchema = z.object({
  eventId: z.string().describe('The scheduled event ID'),
  guildId: z.string().describe('The guild ID the event belongs to'),
  channelId: z
    .string()
    .nullable()
    .describe('The channel ID for the event (null for external events)'),
  name: z.string().describe('The name of the scheduled event'),
  description: z.string().nullable().describe('The description of the scheduled event'),
  scheduledStartTime: z.string().describe('ISO 8601 timestamp of the scheduled start time'),
  scheduledEndTime: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp of the scheduled end time'),
  status: z
    .number()
    .describe('The status of the event (1=SCHEDULED, 2=ACTIVE, 3=COMPLETED, 4=CANCELED)'),
  entityType: z
    .number()
    .describe('The type of the event entity (1=STAGE_INSTANCE, 2=VOICE, 3=EXTERNAL)'),
  location: z.string().nullable().describe('The location of the event (for external events)')
});

let formatEvent = (event: any) => ({
  eventId: event.id,
  guildId: event.guild_id,
  channelId: event.channel_id ?? null,
  name: event.name ?? '',
  description: event.description ?? null,
  scheduledStartTime: event.scheduled_start_time ?? '',
  scheduledEndTime: event.scheduled_end_time ?? null,
  status: event.status,
  entityType: event.entity_type,
  location: event.entity_metadata?.location ?? null
});

export let manageScheduledEventsTool = SlateTool.create(spec, {
  name: 'Manage Scheduled Events',
  key: 'manage_scheduled_events',
  description: `Manage guild scheduled events in Discord. Supports listing, creating, updating, and deleting scheduled events for a guild.`,
  instructions: [
    'Use action "list" to fetch all scheduled events for a guild.',
    'Use action "create" to create a new scheduled event. Requires name, entityType, scheduledStartTime, and privacyLevel. For EXTERNAL events (entityType 3), location and scheduledEndTime are required. For STAGE_INSTANCE (1) or VOICE (2) events, channelId is required.',
    'Use action "update" to modify an existing scheduled event. Provide the eventId and any fields to update. You can also change the status (1=SCHEDULED, 2=ACTIVE, 3=COMPLETED, 4=CANCELED).',
    'Use action "delete" to remove a scheduled event from the guild.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageScheduledEvents)
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The scheduled event action to perform'),
      guildId: z.string().describe('The guild ID to operate in'),
      eventId: z
        .string()
        .optional()
        .describe('The scheduled event ID (required for update and delete)'),
      channelId: z
        .string()
        .optional()
        .describe(
          'The channel ID for the event (required for STAGE_INSTANCE and VOICE events)'
        ),
      name: z
        .string()
        .optional()
        .describe('The name of the scheduled event (required for create)'),
      description: z.string().optional().describe('The description of the scheduled event'),
      scheduledStartTime: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp for the scheduled start time (required for create)'),
      scheduledEndTime: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp for the scheduled end time (required for EXTERNAL events)'
        ),
      entityType: z
        .number()
        .optional()
        .describe(
          'The entity type: 1=STAGE_INSTANCE, 2=VOICE, 3=EXTERNAL (required for create)'
        ),
      privacyLevel: z
        .number()
        .optional()
        .describe('The privacy level: 2=GUILD_ONLY (required for create)'),
      location: z
        .string()
        .optional()
        .describe('The location of the event (required for EXTERNAL events)'),
      status: z
        .number()
        .optional()
        .describe(
          'The status of the event: 1=SCHEDULED, 2=ACTIVE, 3=COMPLETED, 4=CANCELED (for update)'
        )
    })
  )
  .output(
    z.object({
      event: scheduledEventSchema
        .optional()
        .describe('The scheduled event object (for create and update actions)'),
      events: z
        .array(scheduledEventSchema)
        .optional()
        .describe('Array of scheduled event objects (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action, guildId, eventId } = ctx.input;

    if (action === 'list') {
      let rawEvents = await client.listGuildScheduledEvents(guildId);
      let events = rawEvents.map((event: any) => formatEvent(event));
      return {
        output: { events },
        message: `Retrieved ${events.length} scheduled event(s) from guild \`${guildId}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw discordServiceError('name is required for create action');
      if (!ctx.input.entityType)
        throw discordServiceError('entityType is required for create action');
      if (!ctx.input.scheduledStartTime)
        throw discordServiceError('scheduledStartTime is required for create action');
      if (!ctx.input.privacyLevel)
        throw discordServiceError('privacyLevel is required for create action');

      let data: Record<string, any> = {
        name: ctx.input.name,
        entity_type: ctx.input.entityType,
        scheduled_start_time: ctx.input.scheduledStartTime,
        privacy_level: ctx.input.privacyLevel
      };

      if (ctx.input.description) {
        data.description = ctx.input.description;
      }

      if (ctx.input.channelId) {
        data.channel_id = ctx.input.channelId;
      }

      if (ctx.input.scheduledEndTime) {
        data.scheduled_end_time = ctx.input.scheduledEndTime;
      }

      if (ctx.input.location) {
        data.entity_metadata = { location: ctx.input.location };
      }

      let raw = await client.createGuildScheduledEvent(guildId, data);
      let event = formatEvent(raw);
      return {
        output: { event },
        message: `Created scheduled event \`${event.name}\` in guild \`${guildId}\`.`
      };
    }

    if (action === 'update') {
      if (!eventId) throw discordServiceError('eventId is required for update action');

      let data: Record<string, any> = {};

      if (ctx.input.name) {
        data.name = ctx.input.name;
      }

      if (ctx.input.description !== undefined) {
        data.description = ctx.input.description;
      }

      if (ctx.input.channelId) {
        data.channel_id = ctx.input.channelId;
      }

      if (ctx.input.scheduledStartTime) {
        data.scheduled_start_time = ctx.input.scheduledStartTime;
      }

      if (ctx.input.scheduledEndTime) {
        data.scheduled_end_time = ctx.input.scheduledEndTime;
      }

      if (ctx.input.entityType) {
        data.entity_type = ctx.input.entityType;
      }

      if (ctx.input.privacyLevel) {
        data.privacy_level = ctx.input.privacyLevel;
      }

      if (ctx.input.location) {
        data.entity_metadata = { location: ctx.input.location };
      }

      if (ctx.input.status) {
        data.status = ctx.input.status;
      }

      let raw = await client.modifyGuildScheduledEvent(guildId, eventId, data);
      let event = formatEvent(raw);
      return {
        output: { event },
        message: `Updated scheduled event \`${event.name}\` in guild \`${guildId}\`.`
      };
    }

    // delete
    if (!eventId) throw discordServiceError('eventId is required for delete action');
    await client.deleteGuildScheduledEvent(guildId, eventId);
    return {
      output: {},
      message: `Deleted scheduled event \`${eventId}\` from guild \`${guildId}\`.`
    };
  })
  .build();

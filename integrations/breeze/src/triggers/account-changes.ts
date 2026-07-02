import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let POLL_ACTIONS = [
  'person_created',
  'person_updated',
  'person_deleted',
  'person_archived',
  'person_merged',
  'contribution_added',
  'contribution_updated',
  'contribution_deleted',
  'event_created',
  'event_updated',
  'event_deleted',
  'tag_created',
  'tag_updated',
  'tag_deleted',
  'tag_assigned',
  'tag_unassigned',
  'form_created',
  'form_updated',
  'form_deleted',
  'form_entry_updated',
  'form_entry_deleted',
  'volunteer_role_created',
  'volunteer_role_deleted'
] as const;

export let accountChanges = SlateTrigger.create(spec, {
  name: 'Account Changes',
  key: 'account_changes',
  description:
    'Polls the Breeze Account Log for changes across people, contributions, events, tags, forms, and volunteers. Detects create, update, and delete actions.'
})
  .input(
    z.object({
      logEntryId: z.string().describe('Unique log entry ID'),
      action: z.string().describe('Action type (e.g., person_created, contribution_added)'),
      userId: z.string().optional().describe('ID of the user who performed the action'),
      objectJson: z.string().optional().describe('Serialized data related to the action'),
      createdOn: z.string().describe('Timestamp when the action was performed')
    })
  )
  .output(
    z.object({
      logEntryId: z.string().describe('Unique log entry ID'),
      action: z.string().describe('Action type'),
      userId: z.string().optional().describe('ID of the user who performed the action'),
      actionData: z.any().optional().describe('Parsed data related to the action'),
      createdOn: z.string().describe('Timestamp when the action was performed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let lastPolledAt = (ctx.state as { lastPolledAt?: string })?.lastPolledAt;
      let seenIds = (ctx.state as { seenIds?: string[] })?.seenIds || [];

      let now = new Date();
      let startDate =
        lastPolledAt ||
        new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let allEntries: Array<{
        logEntryId: string;
        action: string;
        userId?: string;
        objectJson?: string;
        createdOn: string;
      }> = [];

      for (let action of POLL_ACTIONS) {
        try {
          let entries = await client.listAccountLog({
            action,
            start: startDate,
            details: true
          });

          if (Array.isArray(entries)) {
            for (let entry of entries) {
              if (!seenIds.includes(entry.id)) {
                allEntries.push({
                  logEntryId: entry.id,
                  action: entry.action || action,
                  userId: entry.user_id,
                  objectJson: entry.object_json,
                  createdOn: entry.created_on
                });
              }
            }
          }
        } catch {
          // Skip action types that may not be supported or return errors
        }
      }

      // Sort by created_on ascending so oldest events are processed first
      allEntries.sort((a, b) => a.createdOn.localeCompare(b.createdOn));

      let newSeenIds = [...seenIds, ...allEntries.map(e => e.logEntryId)].slice(-500); // Keep last 500 IDs to prevent unbounded growth

      return {
        inputs: allEntries,
        updatedState: {
          lastPolledAt: now.toISOString().split('T')[0],
          seenIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      let actionData: unknown;
      if (ctx.input.objectJson) {
        try {
          actionData = JSON.parse(ctx.input.objectJson);
        } catch {
          actionData = ctx.input.objectJson;
        }
      }

      return {
        type: ctx.input.action,
        id: ctx.input.logEntryId,
        output: {
          logEntryId: ctx.input.logEntryId,
          action: ctx.input.action,
          userId: ctx.input.userId,
          actionData,
          createdOn: ctx.input.createdOn
        }
      };
    }
  })
  .build();

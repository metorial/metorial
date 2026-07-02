import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let graphEvent = SlateTrigger.create(spec, {
  name: 'Graph Event',
  key: 'graph_event',
  description:
    'Triggered when graph-related events occur, such as episode processing completion or batch ingestion completion.'
})
  .input(
    z.object({
      eventName: z.string().describe('Name of the event'),
      accountId: z.string().optional().describe('Account identifier'),
      projectUid: z.string().optional().describe('Project identifier'),
      graphId: z.string().optional().describe('Graph identifier'),
      userId: z.string().optional().describe('User identifier'),
      graphType: z.string().optional().describe('Type of graph'),
      episodeUuids: z
        .array(z.string())
        .optional()
        .describe('Episode UUIDs from batch ingestion'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('Name of the event that occurred'),
      graphId: z.string().optional().nullable().describe('Identifier of the affected graph'),
      userId: z.string().optional().nullable().describe('Identifier of the affected user'),
      graphType: z
        .string()
        .optional()
        .nullable()
        .describe('Type of graph (user or standalone)'),
      accountId: z.string().optional().nullable().describe('Account identifier'),
      projectUid: z.string().optional().nullable().describe('Project identifier'),
      episodeUuids: z
        .array(z.string())
        .optional()
        .nullable()
        .describe('Episode UUIDs from batch ingestion')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let eventName = data.event_name || 'unknown';

      let input: {
        eventName: string;
        accountId?: string;
        projectUid?: string;
        graphId?: string;
        userId?: string;
        graphType?: string;
        episodeUuids?: string[];
        rawPayload?: Record<string, unknown>;
      } = {
        eventName,
        accountId: data.account_id || data.account_uuid,
        projectUid: data.project_uid || data.project_uuid,
        graphId: data.graph_id,
        userId: data.user_id,
        graphType: data.graph_type,
        rawPayload: data
      };

      if (data.episode_uuids) {
        input.episodeUuids = data.episode_uuids;
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.eventName;

      // Normalize event type: episode.processed, ingest.batch.completed
      let eventType = eventName.includes('.') ? eventName : `graph.${eventName}`;

      // Create a dedup ID based on event details
      let dedupParts = [
        eventType,
        ctx.input.graphId || ctx.input.userId || '',
        Date.now().toString()
      ];
      let dedupId = dedupParts.join('-');

      return {
        type: eventType,
        id: dedupId,
        output: {
          eventName: ctx.input.eventName,
          graphId: ctx.input.graphId,
          userId: ctx.input.userId,
          graphType: ctx.input.graphType,
          accountId: ctx.input.accountId,
          projectUid: ctx.input.projectUid,
          episodeUuids: ctx.input.episodeUuids
        }
      };
    }
  })
  .build();

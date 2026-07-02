import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let teamEventsTrigger = SlateTrigger.create(spec, {
  name: 'Team Events',
  key: 'team_events',
  description:
    'Receives webhook notifications for all events in a Penpot team, including file creation/renaming, comments, and project changes.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of the event (e.g., create-file, rename-file, create-comment-thread)'),
      eventPayload: z.any().describe('Raw event payload from the webhook')
    })
  )
  .output(
    z.object({
      teamId: z.string().optional().describe('ID of the team the event belongs to'),
      fileId: z.string().optional().describe('ID of the affected file'),
      fileName: z.string().optional().describe('Name of the affected file'),
      projectId: z.string().optional().describe('ID of the affected project'),
      commentThreadId: z
        .string()
        .optional()
        .describe('ID of the comment thread (for comment events)'),
      content: z.string().optional().describe('Content of the comment (for comment events)'),
      triggeredBy: z.string().optional().describe('ID of the user who triggered the event'),
      raw: z.any().optional().describe('Full raw event data')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

      let teams = await client.getTeams();
      let results: Array<{ webhookId: string; teamId: string }> = [];

      for (let team of teams) {
        let teamId = team.id;
        try {
          let webhook = await client.createWebhook(
            teamId,
            ctx.input.webhookBaseUrl,
            'application/json'
          );
          results.push({ webhookId: webhook.id, teamId });
        } catch (_e) {
          // If webhook creation fails for a team, continue with others
        }
      }

      return {
        registrationDetails: { webhooks: results }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        webhooks: Array<{ webhookId: string; teamId: string }>;
      };

      if (details?.webhooks) {
        for (let wh of details.webhooks) {
          try {
            await client.deleteWebhook(wh.webhookId);
          } catch (_e) {
            // Ignore cleanup errors
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data = await ctx.request.json();

      // Penpot may send a single event or an array
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((event: any) => ({
        eventType: event.type ?? event['~:type'] ?? 'unknown',
        eventPayload: event
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let { eventType, eventPayload } = ctx.input;
      let payload = eventPayload.props ?? eventPayload;

      let fileId = payload['file-id'] ?? payload.fileId ?? payload.id;
      let fileName = payload.name ?? payload['file-name'] ?? payload.fileName;
      let projectId = payload['project-id'] ?? payload.projectId;
      let teamId = payload['team-id'] ?? payload.teamId;
      let commentThreadId = payload['thread-id'] ?? payload.threadId;
      let content = payload.content;
      let triggeredBy = payload['profile-id'] ?? payload.profileId;

      let normalizedType = eventType.replace(/^~:/, '').replace(/:/g, '.').toLowerCase();
      let eventId =
        payload.id ??
        `${normalizedType}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      return {
        type: normalizedType,
        id: String(eventId),
        output: {
          teamId,
          fileId,
          fileName,
          projectId,
          commentThreadId,
          content,
          triggeredBy,
          raw: eventPayload
        }
      };
    }
  })
  .build();

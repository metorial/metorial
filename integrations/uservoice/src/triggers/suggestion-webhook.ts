import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let suggestionWebhook = SlateTrigger.create(spec, {
  name: 'Suggestion Events',
  key: 'suggestion_events',
  description:
    'Receives webhook events for new suggestions, vote updates, and status changes from UserVoice service hooks. Configure the webhook URL in Admin Console > Settings > Integrations > Service Hooks.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event (e.g., new_suggestion, suggestion_status_update, suggestion_votes_update)'
        ),
      eventId: z.string().describe('Unique ID for deduplication'),
      suggestion: z
        .record(z.string(), z.any())
        .describe('Suggestion data from the webhook payload'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      suggestionId: z.number().describe('ID of the suggestion'),
      title: z.string().describe('Title of the suggestion'),
      body: z.string().nullable().describe('Body/description of the suggestion'),
      state: z.string().nullable().describe('Current state of the suggestion'),
      status: z.string().nullable().describe('Current status name if available'),
      votesCount: z.number().nullable().describe('Number of votes'),
      supportersCount: z.number().nullable().describe('Number of supporters'),
      forumName: z.string().nullable().describe('Name of the forum'),
      creatorName: z
        .string()
        .nullable()
        .describe('Name of the user who created the suggestion'),
      creatorEmail: z.string().nullable().describe('Email of the creator'),
      url: z.string().nullable().describe('Public URL of the suggestion'),
      createdAt: z.string().nullable().describe('When the suggestion was created'),
      updatedAt: z.string().nullable().describe('When the suggestion was last updated')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        let text = await ctx.request.text();
        // UserVoice sends data as form-encoded with 'data' and 'signature' parameters
        let params = new URLSearchParams(text);
        let dataStr = params.get('data');
        if (dataStr) {
          body = JSON.parse(dataStr);
        } else {
          // Fallback: try parsing as raw JSON
          body = JSON.parse(text);
        }
      } catch {
        return { inputs: [] };
      }

      if (!body) return { inputs: [] };

      // Determine event type from payload structure
      let eventType = 'unknown';
      let suggestion: any = null;

      if (body.event) {
        eventType = body.event;
      }

      // UserVoice webhook payloads can vary; extract suggestion data
      if (body.suggestion) {
        suggestion = body.suggestion;
      } else if (body.data?.suggestion) {
        suggestion = body.data.suggestion;
      } else if (body.id && body.title) {
        // The payload itself may be the suggestion
        suggestion = body;
        if (!eventType || eventType === 'unknown') {
          eventType = 'new_suggestion';
        }
      }

      if (!suggestion) return { inputs: [] };

      let eventId = `${eventType}_${suggestion.id || 'unknown'}_${suggestion.updated_at || new Date().toISOString()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            suggestion,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let s = ctx.input.suggestion as any;

      let type: string;
      switch (ctx.input.eventType) {
        case 'new_suggestion':
          type = 'suggestion.created';
          break;
        case 'suggestion_status_update':
          type = 'suggestion.status_updated';
          break;
        case 'suggestion_votes_update':
          type = 'suggestion.votes_updated';
          break;
        default:
          type = `suggestion.${ctx.input.eventType}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          suggestionId: s.id,
          title: s.title || '',
          body: s.body || s.text || null,
          state: s.state || s.status?.key || null,
          status: s.status?.name || s.status_name || null,
          votesCount: s.votes_count ?? s.vote_count ?? null,
          supportersCount: s.supporters_count ?? s.supporter_count ?? null,
          forumName: s.forum?.name || s.forum_name || null,
          creatorName: s.creator?.name || s.user?.name || null,
          creatorEmail: s.creator?.email || s.user?.email || null,
          url: s.url || s.portal_url || null,
          createdAt: s.created_at || null,
          updatedAt: s.updated_at || null
        }
      };
    }
  })
  .build();

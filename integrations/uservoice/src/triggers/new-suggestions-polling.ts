import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newSuggestionsPolling = SlateTrigger.create(spec, {
  name: 'New Suggestions (Polling)',
  key: 'new_suggestions_polling',
  description:
    '[Polling fallback] Polls for new and updated suggestions. Detects suggestions created or modified since the last poll. Useful when webhooks are not configured.'
})
  .input(
    z.object({
      suggestionId: z.number().describe('ID of the suggestion'),
      title: z.string().describe('Title of the suggestion'),
      body: z.string().nullable().describe('Body/description'),
      state: z.string().describe('Current state'),
      votesCount: z.number().describe('Number of votes'),
      supportersCount: z.number().describe('Number of supporters'),
      commentsCount: z.number().describe('Number of comments'),
      createdAt: z.string().describe('When the suggestion was created'),
      updatedAt: z.string().describe('When the suggestion was last updated'),
      links: z.record(z.string(), z.any()).optional().describe('Associated resource links')
    })
  )
  .output(
    z.object({
      suggestionId: z.number().describe('ID of the suggestion'),
      title: z.string().describe('Title of the suggestion'),
      body: z.string().nullable().describe('Body/description'),
      state: z.string().describe('Current state'),
      votesCount: z.number().describe('Number of votes'),
      supportersCount: z.number().describe('Number of supporters'),
      commentsCount: z.number().describe('Number of comments'),
      createdAt: z.string().describe('When the suggestion was created'),
      updatedAt: z.string().describe('When the suggestion was last updated'),
      links: z.record(z.string(), z.any()).optional().describe('Associated resource links')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subdomain: ctx.auth.subdomain
      });

      let lastPoll = ctx.state?.lastPollTimestamp as string | undefined;

      let params: Record<string, unknown> = {
        sort: '-updated_at',
        perPage: 100
      };

      if (lastPoll) {
        params.updatedAfter = lastPoll;
      }

      let result = await client.listSuggestions(params);

      let now = new Date().toISOString();

      let inputs = result.suggestions.map((s: any) => ({
        suggestionId: s.id,
        title: s.title,
        body: s.body || null,
        state: s.state,
        votesCount: s.votes_count || 0,
        supportersCount: s.supporters_count || 0,
        commentsCount: s.comments_count || 0,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        links: s.links
      }));

      return {
        inputs,
        updatedState: {
          lastPollTimestamp: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'suggestion.updated',
        id: `suggestion_${ctx.input.suggestionId}_${ctx.input.updatedAt}`,
        output: {
          suggestionId: ctx.input.suggestionId,
          title: ctx.input.title,
          body: ctx.input.body,
          state: ctx.input.state,
          votesCount: ctx.input.votesCount,
          supportersCount: ctx.input.supportersCount,
          commentsCount: ctx.input.commentsCount,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          links: ctx.input.links
        }
      };
    }
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSuggestion = SlateTool.create(spec, {
  name: 'Get Suggestion',
  key: 'get_suggestion',
  description: `Retrieve detailed information about a specific suggestion (idea) by its ID. Includes vote counts, supporter data, status, category, labels, and associated forum.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      suggestionId: z.number().describe('The ID of the suggestion to retrieve')
    })
  )
  .output(
    z.object({
      suggestionId: z.number().describe('Unique ID of the suggestion'),
      title: z.string().describe('Title of the suggestion'),
      body: z.string().nullable().describe('Body/description of the suggestion'),
      bodyMimeType: z.string().nullable().describe('MIME type of the body content'),
      state: z.string().describe('Current state (e.g., published, approved, closed)'),
      channel: z.string().nullable().describe('Channel where the suggestion was created'),
      votesCount: z.number().describe('Number of votes'),
      commentsCount: z.number().describe('Number of comments'),
      supportersCount: z.number().describe('Number of supporters'),
      supportingAccountsCount: z.number().describe('Number of supporting accounts'),
      averageEngagement: z.number().nullable().describe('Average engagement score'),
      createdAt: z.string().describe('When the suggestion was created'),
      updatedAt: z.string().describe('When the suggestion was last updated'),
      approvedAt: z.string().nullable().describe('When the suggestion was approved'),
      closedAt: z.string().nullable().describe('When the suggestion was closed'),
      links: z.record(z.string(), z.any()).optional().describe('Associated resource links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let s = await client.getSuggestion(ctx.input.suggestionId);

    if (!s) {
      throw new Error(`Suggestion ${ctx.input.suggestionId} not found`);
    }

    let output = {
      suggestionId: s.id,
      title: s.title,
      body: s.body || null,
      bodyMimeType: s.body_mime_type || null,
      state: s.state,
      channel: s.channel || null,
      votesCount: s.votes_count || 0,
      commentsCount: s.comments_count || 0,
      supportersCount: s.supporters_count || 0,
      supportingAccountsCount: s.supporting_accounts_count || 0,
      averageEngagement: s.average_engagement ?? null,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      approvedAt: s.approved_at || null,
      closedAt: s.closed_at || null,
      links: s.links
    };

    return {
      output,
      message: `Retrieved suggestion **"${s.title}"** (ID: ${s.id}) with ${s.supporters_count || 0} supporters and ${s.votes_count || 0} votes.`
    };
  })
  .build();

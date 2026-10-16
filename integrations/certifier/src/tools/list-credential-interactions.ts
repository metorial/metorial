import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCredentialInteractions = SlateTool.create(spec, {
  name: 'List Credential Interactions',
  key: 'list_credential_interactions',
  description: `List interactions (views, downloads, shares, etc.) for a specific credential. Useful for tracking engagement and analytics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to list interactions for'),
      limit: z
        .number()
        .optional()
        .describe('Number of interactions per page (whole number 1–100; default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      interactions: z
        .array(
          z.object({
            interactionId: z.string().describe('ID of the interaction'),
            name: z.string().describe('Interaction event type (compatibility alias)'),
            type: z.string().describe('Interaction event type'),
            createdAt: z.string().describe('Interaction timestamp'),
            triggeredBy: z.string().optional().describe('Actor who triggered the interaction'),
            credentialId: z.string().optional().describe('ID of the credential')
          })
        )
        .describe('List of credential interactions'),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listInteractions(
      ctx.input.credentialId,
      ctx.input.limit,
      ctx.input.cursor
    );

    let interactions = result.data.map(i => ({
      interactionId: i.id,
      triggeredBy: i.triggeredBy,
      credentialId: i.credentialId,
      name: i.eventType,
      type: i.eventType,
      createdAt: i.triggeredAt
    }));

    return {
      output: {
        interactions,
        nextCursor: result.pagination?.next ?? null,
        prevCursor: result.pagination?.prev ?? null
      },
      message: `Retrieved **${interactions.length}** interaction(s) for credential \`${ctx.input.credentialId}\`.${result.pagination?.next ? ' More results available.' : ''}`
    };
  })
  .build();

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
      limit: z.number().optional().describe('Number of interactions per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      interactions: z
        .array(
          z.object({
            interactionId: z.string().describe('ID of the interaction'),
            name: z.string().describe('Name of the interaction'),
            type: z.string().describe('Type of interaction'),
            createdAt: z.string().describe('Interaction timestamp')
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
      name: i.name,
      type: i.type,
      createdAt: i.createdAt
    }));

    return {
      output: {
        interactions,
        nextCursor: result.pagination.next,
        prevCursor: result.pagination.prev
      },
      message: `Retrieved **${interactions.length}** interaction(s) for credential \`${ctx.input.credentialId}\`.${result.pagination.next ? ' More results available.' : ''}`
    };
  })
  .build();

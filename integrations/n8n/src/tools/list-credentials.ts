import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let listCredentials = SlateTool.create(spec, {
  name: 'List Credentials',
  key: 'list_credentials',
  description: `List all credentials stored in your n8n instance. Returns metadata only (name, type, timestamps) without exposing sensitive credential data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      credentialId: z
        .string()
        .optional()
        .describe(
          'Read this exact credential metadata ID instead of listing. Requires credential:read; secret data is not returned.'
        ),
      limit: z.number().optional().describe('Maximum number of credentials to return'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      credentials: z.array(
        z.object({
          credentialId: z.string().describe('Credential ID'),
          name: z.string().describe('Credential name'),
          type: z.string().describe('Credential type'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    let result =
      ctx.input.credentialId !== undefined
        ? { data: [await client.getCredential(ctx.input.credentialId)], nextCursor: undefined }
        : await client.listCredentials({
            limit: ctx.input.limit,
            cursor: ctx.input.cursor
          });

    let credentials = (result.data || []).map(c => ({
      credentialId: String(c.id),
      name: c.name || '',
      type: c.type || '',
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: {
        credentials,
        nextCursor: result.nextCursor
      },
      message: `Found **${credentials.length}** credential(s).${result.nextCursor ? ' More results available with pagination cursor.' : ''}`
    };
  })
  .build();

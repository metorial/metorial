import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBasesTool = SlateTool.create(spec, {
  name: 'List Bases',
  key: 'list_bases',
  description: `List all Airtable bases the authenticated user has access to. Useful for discovering available bases and their IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.string().optional().describe('Pagination offset from a previous response')
    })
  )
  .output(
    z.object({
      bases: z.array(
        z.object({
          baseId: z.string().describe('Base ID'),
          baseName: z.string().describe('Base name'),
          permissionLevel: z
            .string()
            .describe('User permission level on this base (e.g. owner, editor, read)')
        })
      ),
      offset: z
        .string()
        .optional()
        .describe('Pagination offset for the next page, if more bases exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token
    });

    let result = await client.listBases({ offset: ctx.input.offset });

    return {
      output: {
        bases: result.bases.map(b => ({
          baseId: b.id,
          baseName: b.name,
          permissionLevel: b.permissionLevel
        })),
        offset: result.offset
      },
      message: `Found ${result.bases.length} base(s).${result.offset ? ' More bases available (use offset to paginate).' : ''}`
    };
  })
  .build();

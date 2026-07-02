import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let resolveUrlTool = SlateTool.create(spec, {
  name: 'Resolve URL',
  key: 'resolve_url',
  description: `Resolve a Coda browser URL into its API resource representation. Converts a user-facing link (to a doc, page, table, row, etc.) into the corresponding API-addressable resource IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('Coda browser URL to resolve (e.g. "https://coda.io/d/My-Doc_d...")')
    })
  )
  .output(
    z.object({
      resourceType: z
        .string()
        .describe('Type of the resolved resource (e.g. doc, page, table, row)'),
      resourceId: z.string().describe('API ID of the resolved resource'),
      docId: z.string().optional().describe('ID of the containing doc'),
      name: z.string().optional().describe('Name of the resolved resource'),
      browserLink: z.string().optional().describe('Browser link to the resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.resolveUrl(ctx.input.url);

    return {
      output: {
        resourceType: result.type,
        resourceId: result.id,
        docId: result.docId,
        name: result.name,
        browserLink: result.browserLink
      },
      message: `Resolved URL to **${result.type}** resource: **${result.name || result.id}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { domainIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getLinkPreview = SlateTool.create(spec, {
  name: 'Get Link Preview',
  key: 'get_link_preview',
  description:
    'Get a short link’s Open Graph and social preview properties. Call list_domains and list_links to discover identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainId: domainIdSchema,
      linkId: z.string().describe('Link ID from list_links or create_link.')
    })
  )
  .output(
    z.object({
      properties: z
        .unknown()
        .describe('Complete link preview properties returned by Short.io.')
    })
  )
  .handleInvocation(async ctx => {
    let properties = await new Client(ctx.auth).getOpenGraph(
      ctx.input.domainId,
      ctx.input.linkId
    );
    return {
      output: { properties },
      message: `Retrieved preview properties for **${ctx.input.linkId}**.`
    };
  })
  .build();

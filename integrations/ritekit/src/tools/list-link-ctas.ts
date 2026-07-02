import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

export let listLinkCtas = SlateTool.create(spec, {
  name: 'List Link CTAs',
  key: 'list_link_ctas',
  description: `Returns the list of available call-to-action (CTA) options for your account. CTAs are promotional overlays displayed when someone visits a shortened link.
Use this to discover available CTA IDs before creating shortened links with the "Shorten Link" tool.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      ctas: z
        .array(
          z.object({
            ctaId: z.number().describe('CTA identifier to use when shortening links'),
            name: z.string().describe('Display name of the CTA')
          })
        )
        .describe('Available call-to-action options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });
    let result = await client.listCtas();
    let ctas = result.list || [];

    return {
      output: { ctas },
      message: `Found **${ctas.length}** available CTAs: ${ctas.map(c => c.name).join(', ')}`
    };
  })
  .build();

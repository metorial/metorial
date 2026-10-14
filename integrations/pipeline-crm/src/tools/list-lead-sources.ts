import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLeadSources = SlateTool.create(spec, {
  name: 'List Lead Sources',
  key: 'list_lead_sources',
  description:
    'List configured Pipeline CRM lead sources. Use their IDs when creating or updating deals and people.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      sources: z
        .array(
          z.object({
            sourceId: z.number().describe('Lead source ID'),
            name: z.string().nullable().describe('Lead source name')
          })
        )
        .describe('Configured lead sources')
    })
  )
  .handleInvocation(async ctx => {
    let sources = await new Client(ctx.auth).listLeadSources();
    return {
      output: {
        sources: sources.map(source => ({
          sourceId: source.id,
          name: source.name ?? null
        }))
      },
      message: `Found **${sources.length}** lead sources`
    };
  })
  .build();

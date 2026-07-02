import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

export let listTraits = SlateTool.create(spec, {
  name: 'List Traits',
  key: 'list_traits',
  description: `Retrieve all available traits including Faraday-provided traits (1,500+ consumer attributes from the Identity Graph) and custom traits derived from your data. Traits can be included in scope payloads for enrichment and used for cohort filtering.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      traits: z
        .array(
          z.object({
            traitName: z.string().describe('Name/identifier of the trait'),
            traitType: z
              .string()
              .optional()
              .describe('Type of the trait (e.g., string, number, boolean)'),
            category: z.string().optional().describe('Category or group the trait belongs to'),
            description: z.string().optional().describe('Description of the trait')
          })
        )
        .describe('List of all available traits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let traits = await client.listTraits();

    let mapped = traits.map((t: any) => ({
      traitName: t.name || t.id,
      traitType: t.type,
      category: t.category,
      description: t.description
    }));

    return {
      output: { traits: mapped },
      message: `Found **${mapped.length}** trait(s).`
    };
  })
  .build();

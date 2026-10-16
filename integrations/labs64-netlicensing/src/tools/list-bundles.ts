import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBundles = SlateTool.create(spec, {
  name: 'List Bundles',
  key: 'list_bundles',
  description:
    'List configured bundles and their identifiers, pricing, and included license templates for the current vendor.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      bundles: z.array(
        z.object({
          bundleNumber: z.string(),
          name: z.string().optional(),
          active: z.boolean().optional(),
          description: z.string().optional(),
          price: z.number().optional(),
          currency: z.string().optional(),
          licenseTemplatesNumbers: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let items = await new Client(ctx.auth.token).listBundles();
    return {
      message: 'Bundles retrieved.',
      output: {
        bundles: items.map(item => ({
          bundleNumber: item.number,
          name: item.name,
          active: item.active,
          description: item.description,
          price: item.price,
          currency: item.currency,
          licenseTemplatesNumbers: item.licenseTemplatesNumbers
        }))
      }
    };
  })
  .build();

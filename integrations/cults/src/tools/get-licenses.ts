import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let getLicenses = SlateTool.create(spec, {
  name: 'Get Licenses',
  key: 'get_licenses',
  description:
    'List the Cults3D license catalog, including license codes, localized names, links, and whether each license is available for free or paid designs. Use a returned code with create_creation or update_creation.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      licenses: z.array(
        z.object({
          code: z.string().describe('License code for create_creation and update_creation'),
          name: z.string().nullable().describe('English license name'),
          url: z.string().nullable().describe('License information URL'),
          availableOnFreeDesigns: z.boolean().describe('Available for free designs'),
          availableOnPricedDesigns: z.boolean().describe('Available for paid designs')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let licenses = await new CultsClient(ctx.auth).getLicenses();
    return {
      output: { licenses },
      message: `Retrieved ${licenses.length} licenses.`
    };
  })
  .build();

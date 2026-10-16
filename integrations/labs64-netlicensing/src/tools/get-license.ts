import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLicense = SlateTool.create(spec, {
  name: 'Get License',
  key: 'get_license',
  description:
    'Retrieve a license by its number. Use the corresponding list tool to discover identifiers.',
  tags: { readOnly: true }
})
  .input(z.object({ licenseNumber: z.string().describe('License number to retrieve') }))
  .output(
    z.object({
      licenseNumber: z.string().describe('License identifier'),
      licenseeNumber: z.string().optional(),
      licenseTemplateNumber: z.string().optional(),
      productModuleNumber: z.string().optional(),
      name: z.string().optional(),
      active: z.boolean().optional(),
      price: z.number().optional(),
      currency: z.string().optional(),
      hidden: z.boolean().optional(),
      startDate: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).getLicense(ctx.input.licenseNumber);
    if (!result)
      throw createApiServiceError('The response did not contain the requested license.', {
        reason: 'invalid_response'
      });
    return {
      message: 'Requested licensing details retrieved.',
      output: {
        licenseNumber: result.number,
        licenseeNumber: result.licenseeNumber,
        licenseTemplateNumber: result.licenseTemplateNumber,
        productModuleNumber: result.productModuleNumber,
        name: result.name,
        active: result.active,
        price: result.price,
        currency: result.currency,
        hidden: result.hidden,
        startDate: result.startDate
      }
    };
  })
  .build();

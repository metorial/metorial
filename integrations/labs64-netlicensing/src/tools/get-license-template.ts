import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLicenseTemplate = SlateTool.create(spec, {
  name: 'Get License Template',
  key: 'get_license_template',
  description:
    'Retrieve a license template by its number. Use the corresponding list tool to discover identifiers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      licenseTemplateNumber: z.string().describe('License Template number to retrieve')
    })
  )
  .output(
    z.object({
      licenseTemplateNumber: z.string().describe('License Template identifier'),
      productModuleNumber: z.string().optional(),
      name: z.string().optional(),
      active: z.boolean().optional(),
      licenseType: z.string().optional(),
      price: z.number().optional(),
      currency: z.string().optional(),
      automatic: z.boolean().optional(),
      hidden: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).getLicenseTemplate(
      ctx.input.licenseTemplateNumber
    );
    if (!result)
      throw createApiServiceError(
        'The response did not contain the requested license template.',
        { reason: 'invalid_response' }
      );
    return {
      message: 'Requested licensing details retrieved.',
      output: {
        licenseTemplateNumber: result.number,
        productModuleNumber: result.productModuleNumber,
        name: result.name,
        active: result.active,
        licenseType: result.licenseType,
        price: result.price,
        currency: result.currency,
        automatic: result.automatic,
        hidden: result.hidden
      }
    };
  })
  .build();

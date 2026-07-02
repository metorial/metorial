import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicenses = SlateTool.create(spec, {
  name: 'List Licenses',
  key: 'list_licenses',
  description: `Retrieve all licenses for the current vendor. Returns license details including associated licensee, template, pricing, and model-specific properties.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      licenses: z
        .array(
          z.object({
            licenseNumber: z.string().describe('License identifier'),
            licenseeNumber: z.string().optional().describe('Associated licensee'),
            licenseTemplateNumber: z.string().optional().describe('Template number'),
            productModuleNumber: z.string().optional().describe('Module number'),
            name: z.string().optional().describe('License name'),
            active: z.boolean().optional().describe('Whether active'),
            price: z.number().optional().describe('Price'),
            currency: z.string().optional().describe('Currency'),
            hidden: z.boolean().optional().describe('Whether hidden'),
            startDate: z.string().optional().describe('Start date')
          })
        )
        .describe('List of licenses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.listLicenses();
    let licenses = items.map(item => ({
      licenseNumber: item.number,
      licenseeNumber: item.licenseeNumber,
      licenseTemplateNumber: item.licenseTemplateNumber,
      productModuleNumber: item.productModuleNumber,
      name: item.name,
      active: item.active,
      price: item.price,
      currency: item.currency,
      hidden: item.hidden,
      startDate: item.startDate
    }));
    return {
      output: { licenses },
      message: `Found **${licenses.length}** license(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLicenseTemplates = SlateTool.create(spec, {
  name: 'List License Templates',
  key: 'list_license_templates',
  description: `Retrieve all license templates for the current vendor. Templates define the types of licenses available, including pricing, license type, and model-specific settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            licenseTemplateNumber: z.string().describe('Template identifier'),
            productModuleNumber: z.string().optional().describe('Parent module number'),
            name: z.string().optional().describe('Template name'),
            active: z.boolean().optional().describe('Whether active'),
            licenseType: z.string().optional().describe('License type'),
            price: z.number().optional().describe('Price'),
            currency: z.string().optional().describe('Currency'),
            automatic: z.boolean().optional().describe('Whether auto-assigned'),
            hidden: z.boolean().optional().describe('Whether hidden in shop')
          })
        )
        .describe('List of license templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.listLicenseTemplates();
    let templates = items.map(item => ({
      licenseTemplateNumber: item.number,
      productModuleNumber: item.productModuleNumber,
      name: item.name,
      active: item.active,
      licenseType: item.licenseType,
      price: item.price,
      currency: item.currency,
      automatic: item.automatic,
      hidden: item.hidden
    }));
    return {
      output: { templates },
      message: `Found **${templates.length}** license template(s).`
    };
  })
  .build();

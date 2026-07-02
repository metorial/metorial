import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let updateCompanyTool = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update a company's details including name, monthly spend (MRR), and custom fields.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('The ID of the company to update'),
      name: z.string().optional().describe('New company name'),
      monthlySpend: z.number().optional().describe('Updated monthly spend / MRR'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs to update'),
      created: z.string().optional().describe('Override creation date (ISO 8601)')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the updated company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    let result = await client.updateCompany({
      id: ctx.input.companyId,
      name: ctx.input.name,
      monthlySpend: ctx.input.monthlySpend,
      customFields: ctx.input.customFields,
      created: ctx.input.created
    });

    return {
      output: { companyId: result.id },
      message: `Updated company **${result.id}**.`
    };
  })
  .build();

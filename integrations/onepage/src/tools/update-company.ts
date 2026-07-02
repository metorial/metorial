import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { addressSchema, companySchema, customFieldValueSchema } from '../lib/schemas';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update a company's (organization's) details. Companies cannot be created directly — they are created automatically when a contact is assigned a company name. Only provided fields are updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to update'),
      name: z.string().optional().describe('Company name'),
      description: z.string().optional().describe('Company description'),
      phone: z.string().optional().describe('Company phone number'),
      url: z.string().optional().describe('Company website URL'),
      address: addressSchema.optional().describe('Company postal address'),
      customFields: z.array(customFieldValueSchema).optional().describe('Custom field values')
    })
  )
  .output(companySchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let { companyId, ...updateData } = ctx.input;
    let company = await client.updateCompany(companyId, updateData);

    return {
      output: company,
      message: `Updated company **${company.name}** (${company.companyId}).`
    };
  })
  .build();

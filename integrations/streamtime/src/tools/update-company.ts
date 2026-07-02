import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company's details such as name, phone number, tax ID, notes, or account manager.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to update'),
      name: z.string().optional().describe('New company name'),
      phoneNumber: z.string().optional().describe('New main phone number'),
      altPhone: z.string().optional().describe('New alternative phone number'),
      taxId: z.string().optional().describe('New tax ID (ABN/NZBN)'),
      notes: z.string().optional().describe('New notes'),
      accountManagerId: z.number().optional().describe('New account manager user ID')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the updated company'),
      name: z.string().describe('Updated company name'),
      raw: z.record(z.string(), z.any()).describe('Full updated company object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.phoneNumber !== undefined) body.phoneNumber = ctx.input.phoneNumber;
    if (ctx.input.altPhone !== undefined) body.altPhone = ctx.input.altPhone;
    if (ctx.input.taxId !== undefined) body.taxId = ctx.input.taxId;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.accountManagerId !== undefined)
      body.accountManagerId = ctx.input.accountManagerId;

    let result = await client.updateCompany(ctx.input.companyId, body);

    return {
      output: {
        companyId: result.id,
        name: result.name,
        raw: result
      },
      message: `Updated company **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company in Streamtime. Companies can be clients or suppliers and can contain contacts, addresses, and be linked to jobs and invoices.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      phoneNumber: z.string().optional().describe('Main phone number'),
      altPhone: z.string().optional().describe('Alternative phone number'),
      taxId: z.string().optional().describe('Tax ID (ABN/NZBN)'),
      notes: z.string().optional().describe('Notes about the company'),
      accountManagerId: z.number().optional().describe('User ID of the account manager')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the newly created company'),
      name: z.string().describe('Name of the company'),
      raw: z.record(z.string(), z.any()).describe('Full company object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.phoneNumber !== undefined) body.phoneNumber = ctx.input.phoneNumber;
    if (ctx.input.altPhone !== undefined) body.altPhone = ctx.input.altPhone;
    if (ctx.input.taxId !== undefined) body.taxId = ctx.input.taxId;
    if (ctx.input.notes !== undefined) body.notes = ctx.input.notes;
    if (ctx.input.accountManagerId !== undefined)
      body.accountManagerId = ctx.input.accountManagerId;

    let result = await client.createCompany(body);

    return {
      output: {
        companyId: result.id,
        name: result.name,
        raw: result
      },
      message: `Created company **${result.name}** with ID ${result.id}.`
    };
  })
  .build();

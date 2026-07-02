import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company's details in CentralStationCRM. Modify the name, background information, or responsible user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to update'),
      companyName: z.string().optional().describe('Updated company name'),
      background: z.string().optional().describe('Updated background information'),
      responsibleUserId: z.number().optional().describe('ID of the new responsible user')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the updated company'),
      companyName: z.string().optional().describe('Company name'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let data: Record<string, unknown> = {};
    if (ctx.input.companyName !== undefined) data.name = ctx.input.companyName;
    if (ctx.input.background !== undefined) data.background = ctx.input.background;
    if (ctx.input.responsibleUserId !== undefined) data.user_id = ctx.input.responsibleUserId;

    let result = await client.updateCompany(ctx.input.companyId, data);
    let company = result?.company ?? result;

    return {
      output: {
        companyId: company.id,
        companyName: company.name,
        updatedAt: company.updated_at
      },
      message: `Updated company **${company.name}** (ID: ${company.id}).`
    };
  })
  .build();

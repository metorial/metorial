import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a company from Pipeline CRM. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('ID of the company to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the company was successfully deleted'),
      companyId: z.number().describe('ID of the deleted company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    await client.deleteCompany(ctx.input.companyId);

    return {
      output: {
        deleted: true,
        companyId: ctx.input.companyId
      },
      message: `Deleted company with ID **${ctx.input.companyId}**`
    };
  })
  .build();

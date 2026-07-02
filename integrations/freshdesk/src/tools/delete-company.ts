import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Deletes a company from Freshdesk. Use when cleaning up obsolete account records after moving contacts or test data elsewhere.`,
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
      companyId: z.number().describe('ID of the deleted company'),
      deleted: z.boolean().describe('Whether the deletion request succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    await client.deleteCompany(ctx.input.companyId);

    return {
      output: {
        companyId: ctx.input.companyId,
        deleted: true
      },
      message: `Deleted company **#${ctx.input.companyId}**`
    };
  })
  .build();

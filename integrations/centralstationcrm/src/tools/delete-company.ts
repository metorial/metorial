import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a company from CentralStationCRM by its ID. This action cannot be undone.`,
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
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    await client.deleteCompany(ctx.input.companyId);

    return {
      output: {
        companyId: ctx.input.companyId,
        deleted: true
      },
      message: `Deleted company with ID **${ctx.input.companyId}**.`
    };
  })
  .build();

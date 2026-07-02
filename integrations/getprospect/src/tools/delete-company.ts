import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a company record from GetProspect by its ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteCompany(ctx.input.companyId);

    return {
      output: {
        success: true
      },
      message: `Deleted company **${ctx.input.companyId}**.`
    };
  })
  .build();

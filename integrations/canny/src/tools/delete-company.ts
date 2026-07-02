import { SlateTool } from 'slates';
import { z } from 'zod';
import { CannyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteCompanyTool = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a company from Canny. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('The ID of the company to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CannyClient(ctx.auth.token);
    await client.deleteCompany(ctx.input.companyId);

    return {
      output: { success: true },
      message: `Deleted company **${ctx.input.companyId}**.`
    };
  })
  .build();

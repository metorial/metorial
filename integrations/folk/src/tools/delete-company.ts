import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently deletes a company from your Folk workspace. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to delete')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the deleted company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteCompany(ctx.input.companyId);

    return {
      output: {
        companyId: result.id
      },
      message: `Deleted company ${result.id}`
    };
  })
  .build();

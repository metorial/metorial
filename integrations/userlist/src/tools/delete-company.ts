import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Deletes a company from Userlist. The company is identified by its unique identifier. If the company does not exist, the request is silently ignored.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      identifier: z.string().describe('Unique identifier of the company to delete.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the request was accepted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteCompany(ctx.input.identifier);

    return {
      output: { success: true },
      message: `Company **${ctx.input.identifier}** has been deleted.`
    };
  })
  .build();

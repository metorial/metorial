import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAlias = SlateTool.create(spec, {
  name: 'Delete Short URL',
  key: 'delete_alias',
  description: `Permanently deletes a shortened URL alias. The alias will no longer redirect to any destination and the short URL will stop working.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      aliasName: z.string().describe('The alias path to delete.'),
      domainName: z
        .string()
        .optional()
        .describe('The domain the alias belongs to. Defaults to "short.fyi" if omitted.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.'),
      aliasName: z.string().describe('The alias that was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.deleteAlias({
      aliasName: ctx.input.aliasName,
      domainName: ctx.input.domainName
    });

    return {
      output: {
        success: true,
        aliasName: ctx.input.aliasName
      },
      message: `Successfully deleted alias \`${ctx.input.aliasName}\`.`
    };
  })
  .build();

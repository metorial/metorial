import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSslTest = SlateTool.create(spec, {
  name: 'Delete SSL Test',
  key: 'delete_ssl_test',
  description: `Permanently delete an SSL certificate monitoring check. This action cannot be undone.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the SSL test to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteSslTest(ctx.input.testId);

    return {
      output: { success: true },
      message: `Deleted SSL test **${ctx.input.testId}**.`
    };
  })
  .build();

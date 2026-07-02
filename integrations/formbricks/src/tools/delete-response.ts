import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteResponse = SlateTool.create(spec, {
  name: 'Delete Response',
  key: 'delete_response',
  description: `Permanently delete a survey response. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      responseId: z.string().describe('ID of the response to delete')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the deleted response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteResponse(ctx.input.responseId);

    return {
      output: {
        responseId: ctx.input.responseId
      },
      message: `Deleted response \`${ctx.input.responseId}\`.`
    };
  })
  .build();

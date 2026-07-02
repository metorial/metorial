import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

export let deleteResponses = SlateTool.create(spec, {
  name: 'Delete Responses',
  key: 'delete_responses',
  description: `Delete specific form responses by their tokens. Supports GDPR Right To Be Forgotten compliance by permanently removing response data.`,
  constraints: [
    'Response tokens can be found via **Get Responses** in the "token" field of each response.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form containing the responses'),
      responseTokens: z.array(z.string()).min(1).describe('Array of response tokens to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the responses were successfully deleted'),
      deletedCount: z.number().describe('Number of responses requested for deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.deleteResponses(ctx.input.formId, ctx.input.responseTokens);

    return {
      output: {
        deleted: true,
        deletedCount: ctx.input.responseTokens.length
      },
      message: `Deleted **${ctx.input.responseTokens.length}** response(s) from form \`${ctx.input.formId}\`.`
    };
  })
  .build();

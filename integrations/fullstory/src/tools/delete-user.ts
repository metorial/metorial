import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user from FullStory by their uid. This is an asynchronous operation that returns an operation ID for tracking the deletion status.`,
  constraints: [
    'Requires an Admin or Architect API key.',
    'Deletion is asynchronous. Use the Get Operation Status tool to check progress.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      uid: z.string().describe("Your application's unique identifier for the user to delete")
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID for tracking the async deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteUser(ctx.input.uid);

    return {
      output: {
        operationId: result.operationId
      },
      message: `User deletion initiated for uid **${ctx.input.uid}**. Operation ID: \`${result.operationId}\`.`
    };
  })
  .build();

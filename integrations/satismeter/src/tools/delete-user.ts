import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let deleteUserTool = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user from SatisMeter. Requires the SatisMeter internal user ID (not the external userId). Use the **List Users** tool first to find the internal ID.`,
  instructions: [
    'The userInternalId is the SatisMeter internal ID, not the userId you provided during creation. Use List Users to find it.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userInternalId: z
        .string()
        .describe(
          'SatisMeter internal user ID (found via List Users, different from the external userId)'
        )
    })
  )
  .output(
    z.object({
      userInternalId: z.string().describe('The internal ID of the deleted user'),
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    await client.deleteUser(ctx.input.userInternalId);

    return {
      output: { userInternalId: ctx.input.userInternalId, success: true },
      message: `Successfully deleted user with internal ID **${ctx.input.userInternalId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a specific user by their ID from Salesmate. Returns user details including name, email, and role information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to retrieve')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.unknown()).describe('Full user record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getUser(ctx.input.userId);
    let user = result?.Data ?? result;

    return {
      output: { user },
      message: `Retrieved user \`${ctx.input.userId}\`.`
    };
  })
  .build();

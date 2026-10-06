import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let createGroupToken = SlateTool.create(spec, {
  tags: { readOnly: false },
  name: 'Create Group Token',
  key: 'create_group_token',
  description: `Choose an organization with list_organizations. Generate an authentication token for all databases in a group. These SQL tokens grant access to every database within the group; they are different from group-scoped Platform API tokens. Supports read-only access and custom expiration.`,
  instructions: [
    'Expiration format examples: "2w1d30m" for 2 weeks 1 day 30 minutes, "never" for no expiration.'
  ]
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      groupName: z.string().describe('Name of the group to generate a token for'),
      expiration: z
        .string()
        .optional()
        .describe('Token expiration (e.g., "2w1d30m", "never")'),
      authorization: z
        .enum(['full-access', 'read-only'])
        .optional()
        .describe('Token authorization level')
    })
  )
  .output(
    z.object({
      jwt: z.string().describe('The generated JWT token for group access')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.createGroupToken(ctx.input.groupName, {
      expiration: ctx.input.expiration,
      authorization: ctx.input.authorization
    });

    return {
      output: {
        jwt: result.jwt
      },
      message: `Generated ${ctx.input.authorization ?? 'full-access'} token for group **${ctx.input.groupName}**.`
    };
  })
  .build();

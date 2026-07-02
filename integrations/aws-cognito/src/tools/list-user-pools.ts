import { SlateTool } from 'slates';
import { z } from 'zod';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

export let listUserPools = SlateTool.create(spec, {
  name: 'List User Pools',
  key: 'list_user_pools',
  description: `List all Cognito user pools in the configured AWS region. Returns pool names, IDs, statuses, and creation dates. Supports pagination for accounts with many user pools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      maxResults: z
        .number()
        .min(1)
        .max(60)
        .optional()
        .describe('Maximum number of user pools to return (1-60, default 60)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      userPools: z.array(
        z.object({
          userPoolId: z.string(),
          name: z.string(),
          status: z.string().optional(),
          creationDate: z.number().optional(),
          lastModifiedDate: z.number().optional()
        })
      ),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let result = await client.listUserPools(ctx.input.maxResults ?? 60, ctx.input.nextToken);

    let userPools = (result.UserPools || []).map((p: any) => ({
      userPoolId: p.Id,
      name: p.Name,
      status: p.Status,
      creationDate: p.CreationDate,
      lastModifiedDate: p.LastModifiedDate
    }));

    return {
      output: {
        userPools,
        nextToken: result.NextToken
      },
      message: `Found **${userPools.length}** user pool(s).${result.NextToken ? ' More results available with pagination.' : ''}`
    };
  })
  .build();

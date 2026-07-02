import { SlateTool } from 'slates';
import { z } from 'zod';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all groups in a Cognito user pool. Returns group names, descriptions, precedence values, and associated IAM role ARNs. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userPoolId: z.string().describe('User pool ID'),
      limit: z
        .number()
        .min(1)
        .max(60)
        .optional()
        .describe('Maximum number of groups to return (1-60)'),
      nextToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupName: z.string(),
          description: z.string().optional(),
          precedence: z.number().optional(),
          roleArn: z.string().optional(),
          creationDate: z.number().optional(),
          lastModifiedDate: z.number().optional()
        })
      ),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let result = await client.listGroups(
      ctx.input.userPoolId,
      ctx.input.limit,
      ctx.input.nextToken
    );

    let groups = (result.Groups || []).map((g: any) => ({
      groupName: g.GroupName,
      description: g.Description,
      precedence: g.Precedence,
      roleArn: g.RoleArn,
      creationDate: g.CreationDate,
      lastModifiedDate: g.LastModifiedDate
    }));

    return {
      output: {
        groups,
        nextToken: result.NextToken
      },
      message: `Found **${groups.length}** group(s) in pool **${ctx.input.userPoolId}**.`
    };
  })
  .build();

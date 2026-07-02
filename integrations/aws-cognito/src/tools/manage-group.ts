import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageGroup = SlateTool.create(spec, {
  name: 'Manage Group',
  key: 'manage_group',
  description: `Create, get, update, or delete a group in a Cognito user pool. Groups provide role-based access control and can be associated with IAM roles for identity pool authorization.`,
  instructions: [
    'Precedence is a non-negative integer where lower values indicate higher priority.',
    'When multiple groups are assigned to a user, the group with the lowest precedence takes priority for IAM role selection.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      userPoolId: z.string().describe('User pool ID'),
      groupName: z.string().describe('Name of the group'),
      description: z.string().optional().describe('Group description (for create/update)'),
      precedence: z
        .number()
        .optional()
        .describe('Group precedence for IAM role resolution (lower = higher priority)'),
      roleArn: z.string().optional().describe('IAM role ARN to associate with the group')
    })
  )
  .output(
    z.object({
      groupName: z.string().optional(),
      userPoolId: z.string().optional(),
      description: z.string().optional(),
      precedence: z.number().optional(),
      roleArn: z.string().optional(),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let { action, userPoolId, groupName } = ctx.input;

    let mapGroup = (g: any) => ({
      groupName: g.GroupName,
      userPoolId: g.UserPoolId,
      description: g.Description,
      precedence: g.Precedence,
      roleArn: g.RoleArn,
      creationDate: g.CreationDate,
      lastModifiedDate: g.LastModifiedDate
    });

    if (action === 'create') {
      let params: Record<string, any> = {
        UserPoolId: userPoolId,
        GroupName: groupName
      };
      if (ctx.input.description !== undefined) params.Description = ctx.input.description;
      if (ctx.input.precedence !== undefined) params.Precedence = ctx.input.precedence;
      if (ctx.input.roleArn) params.RoleArn = ctx.input.roleArn;

      let result = await client.createGroup(params);
      return {
        output: mapGroup(result.Group),
        message: `Created group **${groupName}** in pool ${userPoolId}.`
      };
    }

    if (action === 'get') {
      let result = await client.getGroup(userPoolId, groupName);
      return {
        output: mapGroup(result.Group),
        message: `Group **${groupName}** found.`
      };
    }

    if (action === 'update') {
      let params: Record<string, any> = {
        UserPoolId: userPoolId,
        GroupName: groupName
      };
      if (ctx.input.description !== undefined) params.Description = ctx.input.description;
      if (ctx.input.precedence !== undefined) params.Precedence = ctx.input.precedence;
      if (ctx.input.roleArn !== undefined) params.RoleArn = ctx.input.roleArn;

      let result = await client.updateGroup(params);
      return {
        output: mapGroup(result.Group),
        message: `Updated group **${groupName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteGroup(userPoolId, groupName);
      return {
        output: { groupName, userPoolId, deleted: true },
        message: `Deleted group **${groupName}** from pool ${userPoolId}.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();

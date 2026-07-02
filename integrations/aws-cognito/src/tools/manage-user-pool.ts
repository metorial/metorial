import { SlateTool } from 'slates';
import { z } from 'zod';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

let passwordPolicySchema = z
  .object({
    minimumLength: z.number().optional().describe('Minimum password length (6-99)'),
    requireUppercase: z.boolean().optional(),
    requireLowercase: z.boolean().optional(),
    requireNumbers: z.boolean().optional(),
    requireSymbols: z.boolean().optional(),
    temporaryPasswordValidityDays: z
      .number()
      .optional()
      .describe('Days before temporary password expires (1-365)')
  })
  .optional();

export let manageUserPool = SlateTool.create(spec, {
  name: 'Manage User Pool',
  key: 'manage_user_pool',
  description: `Create, update, get, or delete a Cognito user pool. When creating, only the pool name is required. When updating, provide the user pool ID and the fields to change. Supports configuring password policies, MFA, auto-verification, and deletion protection.`,
  instructions: [
    'To create a pool, set action to "create" and provide poolName.',
    'To update, set action to "update" and provide userPoolId plus the fields to modify. Note: omitting optional fields may reset them to defaults.',
    'To get details, set action to "get" and provide userPoolId.',
    'To delete, set action to "delete" and provide userPoolId.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      userPoolId: z
        .string()
        .optional()
        .describe('User pool ID (required for get, update, delete)'),
      poolName: z.string().optional().describe('Name of the user pool (required for create)'),
      mfaConfiguration: z
        .enum(['OFF', 'ON', 'OPTIONAL'])
        .optional()
        .describe('MFA configuration'),
      autoVerifiedAttributes: z
        .array(z.enum(['email', 'phone_number']))
        .optional()
        .describe('Attributes to auto-verify'),
      deletionProtection: z.enum(['ACTIVE', 'INACTIVE']).optional(),
      passwordPolicy: passwordPolicySchema,
      userPoolTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags as key-value pairs')
    })
  )
  .output(
    z.object({
      userPoolId: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
      arn: z.string().optional(),
      creationDate: z.number().optional(),
      lastModifiedDate: z.number().optional(),
      mfaConfiguration: z.string().optional(),
      estimatedNumberOfUsers: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.poolName) throw new Error('poolName is required for create action');

      let params: Record<string, any> = { PoolName: ctx.input.poolName };
      if (ctx.input.mfaConfiguration) params.MfaConfiguration = ctx.input.mfaConfiguration;
      if (ctx.input.autoVerifiedAttributes)
        params.AutoVerifiedAttributes = ctx.input.autoVerifiedAttributes;
      if (ctx.input.deletionProtection)
        params.DeletionProtection = ctx.input.deletionProtection;
      if (ctx.input.userPoolTags) params.UserPoolTags = ctx.input.userPoolTags;
      if (ctx.input.passwordPolicy) {
        params.Policies = {
          PasswordPolicy: {
            MinimumLength: ctx.input.passwordPolicy.minimumLength,
            RequireUppercase: ctx.input.passwordPolicy.requireUppercase,
            RequireLowercase: ctx.input.passwordPolicy.requireLowercase,
            RequireNumbers: ctx.input.passwordPolicy.requireNumbers,
            RequireSymbols: ctx.input.passwordPolicy.requireSymbols,
            TemporaryPasswordValidityDays:
              ctx.input.passwordPolicy.temporaryPasswordValidityDays
          }
        };
      }

      let result = await client.createUserPool(params);
      let pool = result.UserPool;

      return {
        output: {
          userPoolId: pool.Id,
          name: pool.Name,
          status: pool.Status,
          arn: pool.Arn,
          creationDate: pool.CreationDate,
          lastModifiedDate: pool.LastModifiedDate,
          mfaConfiguration: pool.MfaConfiguration,
          estimatedNumberOfUsers: pool.EstimatedNumberOfUsers
        },
        message: `Created user pool **${pool.Name}** (${pool.Id}).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.userPoolId) throw new Error('userPoolId is required for get action');
      let result = await client.describeUserPool(ctx.input.userPoolId);
      let pool = result.UserPool;

      return {
        output: {
          userPoolId: pool.Id,
          name: pool.Name,
          status: pool.Status,
          arn: pool.Arn,
          creationDate: pool.CreationDate,
          lastModifiedDate: pool.LastModifiedDate,
          mfaConfiguration: pool.MfaConfiguration,
          estimatedNumberOfUsers: pool.EstimatedNumberOfUsers
        },
        message: `User pool **${pool.Name}** (${pool.Id}) has ~${pool.EstimatedNumberOfUsers ?? 0} users.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.userPoolId) throw new Error('userPoolId is required for update action');

      let params: Record<string, any> = { UserPoolId: ctx.input.userPoolId };
      if (ctx.input.mfaConfiguration) params.MfaConfiguration = ctx.input.mfaConfiguration;
      if (ctx.input.autoVerifiedAttributes)
        params.AutoVerifiedAttributes = ctx.input.autoVerifiedAttributes;
      if (ctx.input.deletionProtection)
        params.DeletionProtection = ctx.input.deletionProtection;
      if (ctx.input.userPoolTags) params.UserPoolTags = ctx.input.userPoolTags;
      if (ctx.input.passwordPolicy) {
        params.Policies = {
          PasswordPolicy: {
            MinimumLength: ctx.input.passwordPolicy.minimumLength,
            RequireUppercase: ctx.input.passwordPolicy.requireUppercase,
            RequireLowercase: ctx.input.passwordPolicy.requireLowercase,
            RequireNumbers: ctx.input.passwordPolicy.requireNumbers,
            RequireSymbols: ctx.input.passwordPolicy.requireSymbols,
            TemporaryPasswordValidityDays:
              ctx.input.passwordPolicy.temporaryPasswordValidityDays
          }
        };
      }

      await client.updateUserPool(params);

      return {
        output: {
          userPoolId: ctx.input.userPoolId
        },
        message: `Updated user pool **${ctx.input.userPoolId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.userPoolId) throw new Error('userPoolId is required for delete action');
      await client.deleteUserPool(ctx.input.userPoolId);

      return {
        output: {
          userPoolId: ctx.input.userPoolId,
          deleted: true
        },
        message: `Deleted user pool **${ctx.input.userPoolId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

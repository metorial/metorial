import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let managePermission = SlateTool.create(spec, {
  name: 'Manage Permission',
  key: 'manage_permission',
  description: `Add, remove, or view resource-based policy statements on a Lambda function. These policies grant other AWS accounts or services (e.g., S3, API Gateway, EventBridge) permission to invoke the function.`,
  instructions: [
    'Use **action** "add" to grant access, "remove" to revoke, or "get" to view the current policy.',
    'For "add", provide a unique statementId, the allowed action (e.g., lambda:InvokeFunction), and the principal.'
  ]
})
  .input(
    z.object({
      action: z.enum(['add', 'remove', 'get']).describe('Operation to perform'),
      functionName: z.string().describe('Function name or ARN'),
      qualifier: z.string().optional().describe('Version or alias'),
      statementId: z
        .string()
        .optional()
        .describe('Unique statement identifier (required for add/remove)'),
      permissionAction: z
        .string()
        .optional()
        .describe('Lambda action to allow (e.g., "lambda:InvokeFunction")'),
      principal: z
        .string()
        .optional()
        .describe('AWS service or account (e.g., "s3.amazonaws.com" or account ID)'),
      sourceArn: z.string().optional().describe('ARN of the source triggering the function'),
      sourceAccount: z.string().optional().describe('AWS account ID of the source'),
      principalOrgId: z.string().optional().describe('AWS Organizations ID for the principal')
    })
  )
  .output(
    z.object({
      statement: z.string().optional().describe('Policy statement JSON'),
      policy: z.string().optional().describe('Full policy JSON (for get action)'),
      revisionId: z.string().optional().describe('Policy revision ID'),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, functionName, qualifier } = ctx.input;

    if (action === 'get') {
      let result = await client.getPolicy(functionName, qualifier);
      return {
        output: {
          policy: result.Policy,
          revisionId: result.RevisionId
        },
        message: `Retrieved resource policy for **${functionName}**.`
      };
    }

    if (action === 'remove') {
      if (!ctx.input.statementId)
        throw lambdaServiceError('statementId is required for remove');
      await client.removePermission(functionName, ctx.input.statementId, qualifier);
      return {
        output: { removed: true },
        message: `Removed permission statement **${ctx.input.statementId}** from **${functionName}**.`
      };
    }

    // add
    if (!ctx.input.statementId) throw lambdaServiceError('statementId is required for add');
    if (!ctx.input.permissionAction)
      throw lambdaServiceError('permissionAction is required for add');
    if (!ctx.input.principal) throw lambdaServiceError('principal is required for add');

    let params: Record<string, any> = {
      StatementId: ctx.input.statementId,
      Action: ctx.input.permissionAction,
      Principal: ctx.input.principal
    };
    if (ctx.input.sourceArn) params.SourceArn = ctx.input.sourceArn;
    if (ctx.input.sourceAccount) params.SourceAccount = ctx.input.sourceAccount;
    if (ctx.input.principalOrgId) params.PrincipalOrgID = ctx.input.principalOrgId;

    let result = await client.addPermission(functionName, params, qualifier);
    return {
      output: {
        statement: result.Statement
      },
      message: `Added permission for **${ctx.input.principal}** to invoke **${functionName}**.`
    };
  })
  .build();

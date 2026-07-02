import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let manageStsTool = SlateTool.create(spec, {
  name: 'Manage STS',
  key: 'manage_sts',
  description: `Inspect the authenticated AWS Security Token Service identity. Use this to confirm which AWS account and principal the configured credentials resolve to before running account-level operations.`,
  instructions: [
    'Use operation "get_caller_identity" to return the AWS account ID, principal ARN, and user ID for the active credentials.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['get_caller_identity'])
        .default('get_caller_identity')
        .describe('The STS operation to perform')
    })
  )
  .output(
    z.object({
      operation: z.string().describe('The operation that was performed'),
      account: z.string().describe('AWS account ID'),
      arn: z.string().describe('ARN of the principal making the request'),
      userId: z.string().describe('Unique identifier of the principal')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.operation !== 'get_caller_identity') {
      throw awsServiceError(`Unknown operation: ${ctx.input.operation}`);
    }

    let client = clientFromContext(ctx);
    let identity = await client.send('STS GetCallerIdentity', () =>
      client.sts.send(new GetCallerIdentityCommand({}))
    );

    if (!identity.Account || !identity.Arn || !identity.UserId) {
      throw awsServiceError(
        'STS GetCallerIdentity response did not include identity details.'
      );
    }

    return {
      output: {
        operation: 'get_caller_identity',
        account: identity.Account,
        arn: identity.Arn,
        userId: identity.UserId
      },
      message: `Authenticated as **${identity.Arn}** in account **${identity.Account}**.`
    };
  })
  .build();

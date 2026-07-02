import { SlateTool } from 'slates';
import { z } from 'zod';
import { cognitoServiceError } from '../lib/errors';
import { createCognitoClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageUserPoolDomain = SlateTool.create(spec, {
  name: 'Manage User Pool Domain',
  key: 'manage_user_pool_domain',
  description: `Create, get, update, or delete a Cognito user pool domain. User pool domains host managed login, OAuth authorization endpoints, and authentication pages for applications.`,
  instructions: [
    'For prefix domains, pass only the prefix, such as "myapp"; Cognito expands it to the regional amazoncognito.com domain.',
    'For custom domains, pass the fully-qualified domain and certificateArn for an ACM certificate in us-east-1.',
    'managedLoginVersion 1 selects classic hosted UI; managedLoginVersion 2 selects newer managed login when the user pool tier supports it.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Operation to perform'),
      userPoolId: z
        .string()
        .optional()
        .describe('User pool ID (required for create, update, delete)'),
      domain: z.string().describe('Domain prefix or custom fully-qualified domain name'),
      certificateArn: z
        .string()
        .optional()
        .describe('ACM certificate ARN in us-east-1 for a custom domain'),
      managedLoginVersion: z
        .number()
        .int()
        .min(1)
        .max(2)
        .optional()
        .describe('1 for classic hosted UI, 2 for newer managed login')
    })
  )
  .output(
    z.object({
      domain: z.string().optional(),
      userPoolId: z.string().optional(),
      awsAccountId: z.string().optional(),
      cloudFrontDomain: z.string().optional(),
      s3Bucket: z.string().optional(),
      status: z.string().optional(),
      version: z.string().optional(),
      certificateArn: z.string().optional(),
      managedLoginVersion: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);
    let { action, domain } = ctx.input;

    let requireUserPoolId = () => {
      if (!ctx.input.userPoolId) {
        throw cognitoServiceError(`userPoolId is required for ${action}`);
      }
      return ctx.input.userPoolId;
    };

    let customDomainConfig = ctx.input.certificateArn
      ? { CertificateArn: ctx.input.certificateArn }
      : undefined;

    let mapDomainDescription = (description: any) => ({
      domain: description.Domain,
      userPoolId: description.UserPoolId,
      awsAccountId: description.AWSAccountId,
      cloudFrontDomain: description.CloudFrontDistribution,
      s3Bucket: description.S3Bucket,
      status: description.Status,
      version: description.Version,
      certificateArn: description.CustomDomainConfig?.CertificateArn,
      managedLoginVersion: description.ManagedLoginVersion
    });

    if (action === 'create') {
      let result = await client.createUserPoolDomain({
        UserPoolId: requireUserPoolId(),
        Domain: domain,
        CustomDomainConfig: customDomainConfig,
        ManagedLoginVersion: ctx.input.managedLoginVersion
      });

      return {
        output: {
          domain,
          userPoolId: ctx.input.userPoolId,
          cloudFrontDomain: result.CloudFrontDomain,
          managedLoginVersion: result.ManagedLoginVersion
        },
        message: `Created user pool domain **${domain}**.`
      };
    }

    if (action === 'get') {
      let result = await client.describeUserPoolDomain(domain);
      let domainDescription = mapDomainDescription(result.DomainDescription);
      return {
        output: domainDescription,
        message: `User pool domain **${domainDescription.domain}** is ${domainDescription.status ?? 'available'}.`
      };
    }

    if (action === 'update') {
      if (!customDomainConfig && ctx.input.managedLoginVersion === undefined) {
        throw cognitoServiceError(
          'managedLoginVersion or certificateArn is required for update'
        );
      }
      let result = await client.updateUserPoolDomain({
        UserPoolId: requireUserPoolId(),
        Domain: domain,
        CustomDomainConfig: customDomainConfig,
        ManagedLoginVersion: ctx.input.managedLoginVersion
      });

      return {
        output: {
          domain,
          userPoolId: ctx.input.userPoolId,
          cloudFrontDomain: result.CloudFrontDomain,
          managedLoginVersion: result.ManagedLoginVersion
        },
        message: `Updated user pool domain **${domain}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteUserPoolDomain(requireUserPoolId(), domain);
      return {
        output: { domain, userPoolId: ctx.input.userPoolId, deleted: true },
        message: `Deleted user pool domain **${domain}**.`
      };
    }

    throw cognitoServiceError(`Unknown action: ${action}`);
  })
  .build();

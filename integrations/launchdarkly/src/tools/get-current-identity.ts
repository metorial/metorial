import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentIdentity = SlateTool.create(spec, {
  name: 'Get Current Identity',
  key: 'get_current_identity',
  description:
    'Identify the API credential currently connected to LaunchDarkly, including its account, token kind, service-token status, scopes, and member profile when available.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string().optional().describe('LaunchDarkly account ID'),
      memberId: z.string().optional().describe('Member ID for a personal token'),
      memberEmail: z.string().optional().describe('Member email for a personal token'),
      memberName: z.string().optional().describe('Member display name for a personal token'),
      tokenId: z.string().optional().describe('Access token ID'),
      tokenName: z.string().optional().describe('Access token name'),
      tokenKind: z.string().optional().describe('Access token kind'),
      clientId: z.string().optional().describe('OAuth client ID when applicable'),
      authKind: z.string().optional().describe('Authentication kind'),
      serviceToken: z.boolean().optional().describe('Whether this is a service token'),
      scopes: z.array(z.string()).describe('Scopes attached to the credential'),
      projectId: z.string().optional().describe('Project ID when the credential is scoped'),
      projectName: z
        .string()
        .optional()
        .describe('Project name when the credential is scoped'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID when the credential is scoped'),
      environmentName: z
        .string()
        .optional()
        .describe('Environment name when the credential is scoped')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let identity = await client.getCallerIdentity();
    let member: any;

    if (identity.memberId) {
      try {
        member = await client.getMember('me');
      } catch {
        // The identity endpoint can be available to tokens that cannot read member details.
      }
    }

    let memberName = member?.firstName
      ? `${member.firstName} ${member.lastName ?? ''}`.trim()
      : undefined;

    return {
      output: {
        accountId: identity.accountId,
        memberId: identity.memberId,
        memberEmail: member?.email,
        memberName,
        tokenId: identity.tokenId,
        tokenName: identity.tokenName,
        tokenKind: identity.tokenKind,
        clientId: identity.clientId,
        authKind: identity.authKind,
        serviceToken: identity.serviceToken,
        scopes: identity.scopes ?? [],
        projectId: identity.projectId,
        projectName: identity.projectName,
        environmentId: identity.environmentId,
        environmentName: identity.environmentName
      },
      message: identity.tokenName
        ? `Connected with LaunchDarkly token **${identity.tokenName}**.`
        : 'Retrieved the current LaunchDarkly credential identity.'
    };
  })
  .build();

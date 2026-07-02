import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { requireAwsSesString } from '../lib/errors';
import { spec } from '../spec';

export let manageEmailIdentity = SlateTool.create(spec, {
  name: 'Manage Email Identity',
  key: 'manage_email_identity',
  description: `Verify and manage sending identities (email addresses or domains) in SES. Identities must be verified before they can be used as a "From" address. Supports creating identities with DKIM configuration, managing mail-from domains, enabling/disabling DKIM signing, and toggling feedback forwarding.`,
  instructions: [
    'For domain identities, SES returns DKIM tokens that need to be added as CNAME records in DNS.',
    'For email identities, SES sends a verification email to the address.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'delete',
          'list',
          'configureDkim',
          'configureMailFrom',
          'configureFeedback'
        ])
        .describe('Operation to perform'),
      emailIdentity: z
        .string()
        .optional()
        .describe('Email address or domain (required for all except "list")'),
      configurationSetName: z
        .string()
        .optional()
        .describe('Configuration set to associate with the identity'),
      dkimSigningEnabled: z
        .boolean()
        .optional()
        .describe('Enable or disable DKIM signing (for "configureDkim")'),
      mailFromDomain: z
        .string()
        .optional()
        .describe('Custom MAIL FROM domain (for "configureMailFrom")'),
      behaviorOnMxFailure: z
        .enum(['USE_DEFAULT_VALUE', 'REJECT_MESSAGE'])
        .optional()
        .describe('Behavior when MX lookup fails'),
      emailForwardingEnabled: z
        .boolean()
        .optional()
        .describe('Enable feedback forwarding (for "configureFeedback")'),
      nextToken: z.string().optional().describe('Pagination token for "list"'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      identityType: z.string().optional().describe('Identity type (EMAIL_ADDRESS or DOMAIN)'),
      identityName: z.string().optional(),
      verifiedForSendingStatus: z.boolean().optional(),
      feedbackForwardingStatus: z.boolean().optional(),
      dkimAttributes: z
        .object({
          signingEnabled: z.boolean(),
          status: z.string(),
          tokens: z.array(z.string()).optional(),
          signingAttributesOrigin: z.string().optional()
        })
        .optional()
        .describe('DKIM configuration details'),
      mailFromAttributes: z
        .object({
          mailFromDomain: z.string().optional(),
          mailFromDomainStatus: z.string().optional(),
          behaviorOnMxFailure: z.string().optional()
        })
        .optional()
        .describe('MAIL FROM configuration'),
      configurationSetName: z.string().optional(),
      identities: z
        .array(
          z.object({
            identityType: z.string(),
            identityName: z.string(),
            sendingEnabled: z.boolean(),
            verificationStatus: z.string().optional()
          })
        )
        .optional()
        .describe('List of identities'),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let emailIdentity = requireAwsSesString(
        ctx.input.emailIdentity,
        'emailIdentity',
        action
      );
      let result = await client.createEmailIdentity({
        emailIdentity,
        configurationSetName: ctx.input.configurationSetName
      });
      return {
        output: {
          identityType: result.identityType,
          verifiedForSendingStatus: result.verifiedForSendingStatus,
          dkimAttributes: result.dkimAttributes
        },
        message: `Identity **${emailIdentity}** created (type: ${result.identityType}). Verified: ${result.verifiedForSendingStatus}.`
      };
    }

    if (action === 'get') {
      let emailIdentity = requireAwsSesString(
        ctx.input.emailIdentity,
        'emailIdentity',
        action
      );
      let result = await client.getEmailIdentity(emailIdentity);
      return {
        output: result,
        message: `Identity **${emailIdentity}**: type=${result.identityType}, verified=${result.verifiedForSendingStatus}.`
      };
    }

    if (action === 'delete') {
      let emailIdentity = requireAwsSesString(
        ctx.input.emailIdentity,
        'emailIdentity',
        action
      );
      await client.deleteEmailIdentity(emailIdentity);
      return {
        output: { identityName: emailIdentity },
        message: `Identity **${emailIdentity}** deleted.`
      };
    }

    if (action === 'list') {
      let result = await client.listEmailIdentities({
        nextToken: ctx.input.nextToken,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          identities: result.identities,
          nextToken: result.nextToken
        },
        message: `Found **${result.identities.length}** identity(ies).${result.nextToken ? ' More results available.' : ''}`
      };
    }

    if (action === 'configureDkim') {
      let emailIdentity = requireAwsSesString(
        ctx.input.emailIdentity,
        'emailIdentity',
        action
      );
      let signingEnabled = ctx.input.dkimSigningEnabled ?? true;
      await client.putEmailIdentityDkimAttributes(emailIdentity, signingEnabled);
      return {
        output: { identityName: emailIdentity },
        message: `DKIM signing ${signingEnabled ? 'enabled' : 'disabled'} for **${emailIdentity}**.`
      };
    }

    if (action === 'configureMailFrom') {
      let emailIdentity = requireAwsSesString(
        ctx.input.emailIdentity,
        'emailIdentity',
        action
      );
      await client.putEmailIdentityMailFromAttributes(
        emailIdentity,
        ctx.input.mailFromDomain,
        ctx.input.behaviorOnMxFailure
      );
      return {
        output: { identityName: emailIdentity },
        message: `MAIL FROM domain updated for **${emailIdentity}**.`
      };
    }

    if (action === 'configureFeedback') {
      let emailIdentity = requireAwsSesString(
        ctx.input.emailIdentity,
        'emailIdentity',
        action
      );
      let emailForwardingEnabled = ctx.input.emailForwardingEnabled ?? true;
      await client.putEmailIdentityFeedbackAttributes(emailIdentity, emailForwardingEnabled);
      return {
        output: { identityName: emailIdentity },
        message: `Feedback forwarding ${emailForwardingEnabled ? 'enabled' : 'disabled'} for **${emailIdentity}**.`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();

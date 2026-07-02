import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmailTool = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify an email address by checking syntax, domain existence and availability, and email account existence. Returns verification status along with metadata about the email address such as whether it is disposable, a role-based address, or uses a public email provider.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify'),
      features: z
        .string()
        .optional()
        .describe(
          'Comma-separated verification methods: "domain", "connection", "provider". Defaults to "domain,connection".'
        )
    })
  )
  .output(
    z.object({
      isVerified: z.boolean().describe('Whether the email address is verified as deliverable'),
      verifiedEmail: z.string().optional().describe('The verified email address'),
      emailAccount: z.string().optional().describe('The local part of the email (before @)'),
      emailDomain: z.string().optional().describe('The domain part of the email (after @)'),
      emailProviderDomain: z
        .string()
        .optional()
        .describe('The underlying email service provider domain'),
      isDisposable: z
        .boolean()
        .optional()
        .describe('Whether the email uses a disposable email provider'),
      isRole: z
        .boolean()
        .optional()
        .describe('Whether the email is a role/group address (e.g., info@, support@)'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the email uses a public provider (e.g., Gmail, Yahoo)'),
      isCatchAll: z.boolean().optional().describe('Whether the domain has a catch-all policy'),
      notVerifiedReason: z
        .string()
        .optional()
        .describe('Reason the email could not be verified'),
      notVerifiedCode: z
        .string()
        .optional()
        .describe('Error code if email could not be verified'),
      success: z.boolean().describe('Whether the API request was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      authMethod: ctx.auth.authMethod
    });

    let data = await client.verifyEmail({
      email: ctx.input.email,
      features: ctx.input.features
    });

    return {
      output: {
        isVerified: data.is_verified ?? false,
        verifiedEmail: data.verified_email,
        emailAccount: data.email_account,
        emailDomain: data.email_domain,
        emailProviderDomain: data.email_provider_domain,
        isDisposable: data.is_disposable,
        isRole: data.is_role,
        isPublic: data.is_public,
        isCatchAll: data.is_catch_all,
        notVerifiedReason: data.not_verified_reason,
        notVerifiedCode: data.not_verified_code,
        success: data.success ?? true
      },
      message: data.is_verified
        ? `Email **${ctx.input.email}** is **verified** as deliverable.`
        : `Email **${ctx.input.email}** could **not** be verified. Reason: ${data.not_verified_reason || 'unknown'}`
    };
  })
  .build();

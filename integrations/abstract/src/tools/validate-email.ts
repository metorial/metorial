import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validates an email address and returns deliverability status, risk assessment, and detailed checks. Use this to verify email addresses before sending, detect disposable or role-based emails, and reduce bounce rates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to validate'),
      autoCorrect: z
        .boolean()
        .optional()
        .describe('Whether to suggest auto-corrected email if a typo is detected')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was validated'),
      autocorrect: z
        .string()
        .optional()
        .describe('Suggested corrected email address if a typo was detected'),
      deliverability: z
        .string()
        .optional()
        .describe('Deliverability status: DELIVERABLE, UNDELIVERABLE, or UNKNOWN'),
      qualityScore: z.number().optional().describe('Quality score from 0.00 to 1.00'),
      isValidFormat: z.boolean().optional().describe('Whether the email format is valid'),
      isFreeEmail: z
        .boolean()
        .optional()
        .describe('Whether the email is from a free provider like Gmail'),
      isDisposableEmail: z
        .boolean()
        .optional()
        .describe('Whether the email is from a disposable/temporary provider'),
      isRoleEmail: z
        .boolean()
        .optional()
        .describe('Whether the email is a role-based address like info@ or admin@'),
      isCatchallEmail: z
        .boolean()
        .optional()
        .describe('Whether the domain is configured as catch-all'),
      isMxFound: z
        .boolean()
        .optional()
        .describe('Whether MX records were found for the domain'),
      isSmtpValid: z.boolean().optional().describe('Whether the SMTP check passed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.validateEmail({
      email: ctx.input.email,
      autoCorrect: ctx.input.autoCorrect
    });

    let output = {
      email: result.email ?? ctx.input.email,
      autocorrect: result.autocorrect ?? undefined,
      deliverability: result.deliverability ?? undefined,
      qualityScore: result.quality_score != null ? Number(result.quality_score) : undefined,
      isValidFormat: result.is_valid_format?.value ?? undefined,
      isFreeEmail: result.is_free_email?.value ?? undefined,
      isDisposableEmail: result.is_disposable_email?.value ?? undefined,
      isRoleEmail: result.is_role_email?.value ?? undefined,
      isCatchallEmail: result.is_catchall_email?.value ?? undefined,
      isMxFound: result.is_mx_found?.value ?? undefined,
      isSmtpValid: result.is_smtp_valid?.value ?? undefined
    };

    let status = output.deliverability ?? 'UNKNOWN';
    return {
      output,
      message: `Email **${output.email}** is **${status}**${output.qualityScore != null ? ` (quality score: ${output.qualityScore})` : ''}.`
    };
  })
  .build();

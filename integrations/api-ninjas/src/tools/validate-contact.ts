import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateContact = SlateTool.create(spec, {
  name: 'Validate Email or Phone',
  key: 'validate_contact',
  description: `Validate an email address or phone number. Email checks include formatting, disposable domains, and domain DNS. Phone results include country, formatting, line type, and time zones when available.`,
  instructions: ['Provide either an email or a phone number (or both) to validate.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().optional().describe('Email address to validate'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number to validate (include country code, e.g. +14155552671)'),
      phoneCountry: z
        .string()
        .optional()
        .describe('Optional ISO 3166 two-letter country code for national phone numbers')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider responses'),
      emailValidation: z
        .object({
          email: z.string().describe('The email that was checked'),
          isValid: z.boolean().describe('Whether the email format is valid'),
          isDisposable: z
            .boolean()
            .optional()
            .describe('Whether it is a disposable/temporary email'),
          hasMxRecords: z
            .boolean()
            .optional()
            .describe('Whether the domain has valid MX records')
        })
        .optional()
        .describe('Email validation results'),
      phoneValidation: z
        .object({
          phoneNumber: z.string().describe('The phone number that was checked'),
          isValid: z.boolean().describe('Whether the phone number is valid'),
          country: z.string().optional().describe('Associated country'),
          carrier: z.string().optional().describe('Phone carrier'),
          lineType: z.string().optional().describe('Line type (mobile, landline, etc.)'),
          timezones: z.array(z.string()).optional().describe('Associated IANA time zones'),
          formatE164: z.string().optional().describe('Phone number in E.164 format')
        })
        .optional()
        .describe('Phone validation results')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.email?.trim() && !ctx.input.phoneNumber?.trim()) {
      throw createApiServiceError('Provide an email address or phone number to validate.');
    }
    let client = new Client({ token: ctx.auth.token });
    let [email, phone] = await Promise.all([
      ctx.input.email?.trim() ? client.validateEmail(ctx.input.email) : undefined,
      ctx.input.phoneNumber?.trim()
        ? client.validatePhone(ctx.input.phoneNumber, ctx.input.phoneCountry)
        : undefined
    ]);
    if (
      (email && typeof email.is_valid !== 'boolean') ||
      (phone && typeof phone.is_valid !== 'boolean')
    ) {
      throw createApiServiceError(
        'API Ninjas did not return a validation status. Retry the request.'
      );
    }
    let messages: string[] = [];
    if (email)
      messages.push(`Email **${ctx.input.email}**: ${email.is_valid ? 'valid' : 'invalid'}.`);
    if (phone)
      messages.push(
        `Phone **${ctx.input.phoneNumber}**: ${phone.is_valid ? 'valid' : 'invalid'}.`
      );
    return {
      output: {
        raw: {
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { phone } : {})
        },
        emailValidation: email
          ? {
              email: email.email ?? ctx.input.email!,
              isValid: email.is_valid,
              isDisposable: email.is_disposable ?? undefined,
              hasMxRecords:
                typeof email.is_mx_found?.value === 'boolean'
                  ? email.is_mx_found.value
                  : (email.has_mx_records ?? undefined)
            }
          : undefined,
        phoneValidation: phone
          ? {
              phoneNumber: phone.number ?? ctx.input.phoneNumber!,
              isValid: phone.is_valid,
              country: phone.country ?? undefined,
              carrier: phone.carrier ?? undefined,
              lineType: phone.line_type ?? undefined,
              timezones: phone.timezones ?? undefined,
              formatE164: phone.format_e164 ?? undefined
            }
          : undefined
      },
      message: messages.join('\n')
    };
  })
  .build();

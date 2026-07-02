import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailResultSchema = z.object({
  email: z.string().describe('The validated email address'),
  didYouMean: z
    .string()
    .nullable()
    .describe('Suggested correction if a domain typo was detected'),
  user: z.string().nullable().describe('Local part of the email address (before @)'),
  domain: z.string().nullable().describe('Domain part of the email address (after @)'),
  formatValid: z
    .boolean()
    .nullable()
    .describe('Whether the email format is valid per RFC standards'),
  mxFound: z.boolean().nullable().describe('Whether MX records were found for the domain'),
  smtpCheck: z.boolean().nullable().describe('Whether the SMTP mailbox verification passed'),
  catchAll: z.boolean().nullable().describe('Whether the domain is a catch-all address'),
  role: z
    .boolean()
    .nullable()
    .describe('Whether the email is a role-based address (e.g., support@, info@)'),
  disposable: z
    .boolean()
    .nullable()
    .describe('Whether the email is from a disposable/temporary provider'),
  free: z
    .boolean()
    .nullable()
    .describe('Whether the email is from a free provider (e.g., Gmail, Yahoo)'),
  score: z.number().nullable().describe('Overall deliverability quality score between 0 and 1')
});

export let bulkValidateEmails = SlateTool.create(spec, {
  name: 'Bulk Validate Emails',
  key: 'bulk_validate_emails',
  description: `Validates and verifies multiple email addresses in a single request. Each email undergoes the same checks as single validation: syntax, MX records, SMTP verification, free/disposable/role detection, and quality scoring.
Returns an array of validation results, one per email address.`,
  instructions: [
    'Provide email addresses as an array of strings.',
    'Disabling SMTP check significantly speeds up the response but reduces verification accuracy.'
  ],
  constraints: [
    'Requires a Professional Plus (up to 25 emails) or Enterprise Plus (up to 100 emails) plan.',
    'Maximum of 100 email addresses per request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      emails: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('List of email addresses to validate'),
      smtp: z
        .boolean()
        .optional()
        .describe(
          'Enable SMTP verification. Enabled by default. Disable to speed up response.'
        ),
      catchAll: z
        .boolean()
        .optional()
        .describe(
          'Enable catch-all detection on the recipient SMTP server. Disabled by default.'
        )
    })
  )
  .output(
    z.object({
      results: z
        .array(emailResultSchema)
        .describe('Validation results for each email address'),
      totalCount: z.number().describe('Total number of emails validated'),
      validCount: z.number().describe('Number of emails with valid format'),
      deliverableCount: z.number().describe('Number of emails that passed SMTP verification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.bulkValidateEmails({
      emails: ctx.input.emails,
      smtp: ctx.input.smtp,
      catchAll: ctx.input.catchAll
    });

    let validCount = results.filter(r => r.formatValid === true).length;
    let deliverableCount = results.filter(r => r.smtpCheck === true).length;

    return {
      output: {
        results,
        totalCount: results.length,
        validCount,
        deliverableCount
      },
      message: `Validated **${results.length}** email addresses — **${validCount}** have valid format, **${deliverableCount}** passed SMTP verification.`
    };
  })
  .build();

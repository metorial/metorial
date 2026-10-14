import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapEmailValidationResult } from '../lib/results';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate a single email address in real time. Returns a deliverability classification (\`deliverable\`, \`undeliverable\`, \`risky\`, or \`unknown\`), a validity score from 0–100, and detailed checks including format validity, domain validity, MX records, blocklist status, catch-all detection, and free provider detection.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to validate')
    })
  )
  .output(
    z.object({
      validationId: z.string().describe('Unique identifier for this validation request'),
      email: z.string().describe('The validated email address'),
      username: z
        .string()
        .describe('Local part of the email (before @), or empty if unavailable'),
      domain: z
        .string()
        .describe('Domain part of the email (after @), or empty if unavailable'),
      mxRecord: z
        .string()
        .describe('Mail exchanger record for the domain, or empty if unavailable'),
      score: z.number().describe('Validity score from 0 to 100'),
      result: z
        .string()
        .describe(
          'Deliverability classification: deliverable, undeliverable, risky, or unknown'
        ),
      reason: z
        .string()
        .describe(
          'Specific reason for the result: accepted_email, invalid_format, invalid_domain, invalid_smtp, rejected_email, catch_all, disposable, no_connect, timeout, or other'
        ),
      isFormatValid: z.boolean().describe('Whether the email format is valid'),
      isDomainValid: z.boolean().describe('Whether the domain is valid'),
      isMxValid: z
        .boolean()
        .describe(
          'True if MX records were checked and are valid. Check isMxChecked before treating false as invalid.'
        ),
      isMxChecked: z
        .boolean()
        .describe('Whether the provider checked MX records; false when its MX result is null'),
      isNotBlocklisted: z.boolean().describe('Whether the email is not on any blocklist'),
      isNotCatchAll: z.boolean().describe('Whether the domain is not a catch-all'),
      isNotGeneric: z
        .boolean()
        .describe('Whether the email is not a generic/role-based address'),
      isFreeProvider: z
        .boolean()
        .describe('Whether the email uses a free provider (e.g. Gmail, Yahoo)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.validateEmail(ctx.input.email);
    let output = mapEmailValidationResult(data);

    return {
      output,
      message: `**${data.email}** — **${data.result}** (score: ${data.score}/100, reason: ${data.reason})`
    };
  })
  .build();

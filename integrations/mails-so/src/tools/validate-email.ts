import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      username: z.string().describe('Local part of the email (before @)'),
      domain: z.string().describe('Domain part of the email (after @)'),
      mxRecord: z.string().describe('Mail exchanger record for the domain'),
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
      isMxValid: z.boolean().describe('Whether MX records exist and are valid'),
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
    let response = await client.validateEmail(ctx.input.email);
    let data = response.data;

    let output = {
      validationId: data.id,
      email: data.email,
      username: data.username,
      domain: data.domain,
      mxRecord: data.mx_record,
      score: data.score,
      result: data.result,
      reason: data.reason,
      isFormatValid: data.isv_format,
      isDomainValid: data.isv_domain,
      isMxValid: data.isv_mx,
      isNotBlocklisted: data.isv_noblock,
      isNotCatchAll: data.isv_nocatchall,
      isNotGeneric: data.isv_nogeneric,
      isFreeProvider: data.is_free
    };

    return {
      output,
      message: `**${data.email}** — **${data.result}** (score: ${data.score}/100, reason: ${data.reason})`
    };
  })
  .build();

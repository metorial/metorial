import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let validateEmail = SlateTool.create(spec, {
  name: 'Validate Email',
  key: 'validate_email',
  description: `Validate a single email address to determine if it is valid, invalid, suspicious, or unknown. Returns a validity score (0-100), the cause of any issues (e.g., disposable, spamtrap, mailbox not found), and a suggested correction for typos.
Best used for real-time form validation, not bulk validation.`,
  constraints: [
    'Maximum of 2 concurrent validation requests allowed.',
    'Intended for single real-time checks, not bulk validation.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to validate')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The validated email address'),
      validity: z
        .string()
        .describe('Validation result: valid, invalid, suspicious, or unknown'),
      validityScore: z
        .number()
        .optional()
        .describe('Validity score from 0 (invalid) to 100 (valid)'),
      localPart: z.string().optional().describe('Local part of the email (before @)'),
      domain: z.string().optional().describe('Domain part of the email (after @)'),
      mxFound: z.boolean().optional().describe('Whether MX records were found for the domain'),
      mxRecord: z.string().optional().describe('MX record found for the domain'),
      cause: z
        .string()
        .optional()
        .describe(
          'Cause of invalidity (e.g., disposable, spamtrap, mailbox_not_found, possible_typo)'
        ),
      suggestedCorrection: z
        .string()
        .optional()
        .describe('Suggested correction for potential typos')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });

    let result = await client.validateEmail(ctx.input.email);

    return {
      output: {
        email: result.email,
        validity: result.validity,
        validityScore: result.validity_score,
        localPart: result.local_part,
        domain: result.domain,
        mxFound: result.mx_found,
        mxRecord: result.mx_record,
        cause: result.cause,
        suggestedCorrection: result.did_you_mean
      },
      message: `**${result.email}** is **${result.validity}**${result.validity_score !== undefined ? ` (score: ${result.validity_score}/100)` : ''}${result.cause ? ` — cause: ${result.cause}` : ''}${result.did_you_mean ? ` — did you mean: ${result.did_you_mean}?` : ''}`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

let confidenceVerdictSchema = z
  .object({
    confidenceVerdict: z.string().optional()
  })
  .optional();

export let getEmailAddressInsights = SlateTool.create(spec, {
  name: 'Get Email Address Insights',
  key: 'get_email_address_insights',
  description:
    'Analyze an email address with Amazon SES validation insights, including syntax, DNS, disposable-address, role-address, random-input, and mailbox-existence signals.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailAddress: z.string().describe('Email address to analyze for validation insights')
    })
  )
  .output(
    z.object({
      emailAddress: z.string(),
      mailboxValidation: z
        .object({
          isValid: confidenceVerdictSchema,
          evaluations: z
            .object({
              hasValidDnsRecords: confidenceVerdictSchema,
              hasValidSyntax: confidenceVerdictSchema,
              isDisposable: confidenceVerdictSchema,
              isRandomInput: confidenceVerdictSchema,
              isRoleAddress: confidenceVerdictSchema,
              mailboxExists: confidenceVerdictSchema
            })
            .optional()
        })
        .optional()
        .describe('Mailbox validation verdicts returned by SES')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.getEmailAddressInsights(ctx.input.emailAddress);
    let verdict = result.mailboxValidation?.isValid?.confidenceVerdict ?? 'UNKNOWN';

    return {
      output: result,
      message: `Email address **${ctx.input.emailAddress}** validation verdict: **${verdict}**.`
    };
  })
  .build();

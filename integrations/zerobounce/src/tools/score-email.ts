import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scoreEmail = SlateTool.create(spec, {
  name: 'Score Email',
  key: 'score_email',
  description: `Uses ZeroBounce A.I. to rate the quality of an email address, returning a score from 0 to 10 indicating how likely the subscriber is to engage.
A score of 10 is ideal, while 0 indicates a high-risk address (spam trap, inactive, etc.). Useful for evaluating catch-all emails and segmenting lists by engagement likelihood.`,
  instructions: [
    'A score of 0 means the email should not be sent to, though it may not necessarily be invalid.',
    'Best used on catch-all emails where standard validation cannot determine deliverability.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to score')
    })
  )
  .output(
    z.object({
      address: z.string().describe('The email address that was scored'),
      status: z.string().describe('Validation status of the email'),
      subStatus: z.string().optional().describe('Detailed sub-status code'),
      zerobounceScore: z
        .number()
        .nullable()
        .describe('AI quality score from 0 to 10, where 10 is ideal'),
      account: z
        .string()
        .nullable()
        .optional()
        .describe('The local part of the email address'),
      domain: z.string().nullable().optional().describe('The domain of the email address'),
      processedAt: z
        .string()
        .optional()
        .describe('UTC timestamp when the scoring was processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.info(`Scoring email: ${ctx.input.email}`);
    let result = await client.scoreEmail(ctx.input.email);

    let output = {
      address: String(result.address || ctx.input.email),
      status: String(result.status || ''),
      subStatus: result.sub_status ? String(result.sub_status) : undefined,
      zerobounceScore:
        result.zerobounce_score !== undefined ? Number(result.zerobounce_score) : null,
      account: result.account as string | null | undefined,
      domain: result.domain as string | null | undefined,
      processedAt: result.processed_at ? String(result.processed_at) : undefined
    };

    let scoreDisplay =
      output.zerobounceScore !== null ? `**${output.zerobounceScore}/10**` : 'unavailable';

    return {
      output,
      message: `Email **${output.address}** scored ${scoreDisplay} (status: ${output.status}).`
    };
  })
  .build();

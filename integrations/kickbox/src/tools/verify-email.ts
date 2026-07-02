import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address in real-time. Returns deliverability status, quality score, and detailed attributes such as whether the email is disposable, role-based, free, or accept-all. Also detects common typos and suggests corrections.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify.'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum time in milliseconds to wait for verification. Defaults to 6000ms.')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The normalized email address that was verified.'),
      result: z
        .enum(['deliverable', 'undeliverable', 'risky', 'unknown'])
        .describe('The verification result.'),
      reason: z
        .string()
        .describe('The reason for the verification result, providing more context.'),
      isRole: z
        .boolean()
        .describe('Whether the email is a role address (e.g. postmaster@, support@).'),
      isFree: z
        .boolean()
        .describe('Whether the email uses a free email service (e.g. gmail.com, yahoo.com).'),
      isDisposable: z
        .boolean()
        .describe('Whether the email uses a disposable/temporary domain.'),
      isAcceptAll: z
        .boolean()
        .describe('Whether the domain appears to accept all email addresses.'),
      sendexScore: z
        .number()
        .describe('Email quality score from 0 (no quality) to 1 (perfect quality).'),
      suggestedCorrection: z
        .string()
        .nullable()
        .describe('Suggested correction if a typo was detected in the email domain.'),
      user: z.string().describe('The local part of the email address (before the @).'),
      domain: z.string().describe('The domain part of the email address (after the @).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyEmail({
      email: ctx.input.email,
      timeout: ctx.input.timeout
    });

    if (!result.success) {
      throw new Error(result.message || 'Email verification failed.');
    }

    let output = {
      email: result.email,
      result: result.result as 'deliverable' | 'undeliverable' | 'risky' | 'unknown',
      reason: result.reason,
      isRole: result.role,
      isFree: result.free,
      isDisposable: result.disposable,
      isAcceptAll: result.accept_all,
      sendexScore: result.sendex,
      suggestedCorrection: result.did_you_mean,
      user: result.user,
      domain: result.domain
    };

    let summaryParts = [`**${result.email}** is **${result.result}**`];
    if (result.reason) {
      summaryParts.push(`(${result.reason})`);
    }
    summaryParts.push(`with a Sendex quality score of **${result.sendex}**.`);

    let flags: string[] = [];
    if (result.role) flags.push('role address');
    if (result.free) flags.push('free email');
    if (result.disposable) flags.push('disposable');
    if (result.accept_all) flags.push('accept-all domain');
    if (flags.length > 0) {
      summaryParts.push(`Flags: ${flags.join(', ')}.`);
    }
    if (result.did_you_mean) {
      summaryParts.push(`Did you mean **${result.did_you_mean}**?`);
    }

    return {
      output,
      message: summaryParts.join(' ')
    };
  })
  .build();

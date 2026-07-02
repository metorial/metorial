import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let gravatarAccountSchema = z.object({
  domain: z.string().optional().describe('Account domain'),
  shortname: z.string().optional().describe('Account service shortname'),
  username: z.string().optional().describe('Account username'),
  userid: z.string().optional().describe('Account user ID'),
  url: z.string().optional().describe('Account URL'),
  verified: z.string().optional().describe('Whether the account is verified')
});

let gravatarEntrySchema = z.object({
  profileUrl: z.string().optional().describe('Gravatar profile URL'),
  preferredUsername: z.string().optional().describe('Preferred username on Gravatar'),
  accounts: z.array(gravatarAccountSchema).optional().describe('Linked accounts on Gravatar')
});

let facebookSchema = z.object({
  id: z.string().optional().describe('Facebook user ID'),
  name: z.string().optional().describe('Facebook display name')
});

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify a single email address for validity and deliverability. Returns a trust score (0–100), MX/SMTP validation results, disposable email detection, and social profile data (Gravatar, GitHub, Facebook) when available.

Emails with a trust rate of **0–49%** are considered risky and most likely invalid. Emails with a trust rate of **50–100%** are considered valid.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The verified email address'),
      trustRate: z
        .number()
        .describe('Trust score from 0 to 100. 50–100 is valid, 0–49 is risky/invalid'),
      mxExists: z.boolean().describe('Whether MX records exist for the email domain'),
      smtpExists: z.boolean().describe('Whether the SMTP server exists and responds'),
      isNotSmtpCatchAll: z
        .boolean()
        .describe('Whether the email is NOT on a catch-all SMTP server'),
      isNotDisposable: z
        .boolean()
        .describe('Whether the email is NOT from a disposable email provider'),
      gravatar: z
        .object({
          entries: z.array(gravatarEntrySchema).optional().describe('Gravatar profile entries')
        })
        .optional()
        .describe('Gravatar profile data if available'),
      githubUsername: z.string().optional().describe('Associated GitHub username if found'),
      facebook: facebookSchema.optional().describe('Associated Facebook profile data if found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifySingleEmail(ctx.input.email);

    let status = result.trustRate >= 50 ? 'valid' : 'risky/invalid';

    return {
      output: {
        email: result.email,
        trustRate: result.trustRate,
        mxExists: result.mxExists,
        smtpExists: result.smtpExists,
        isNotSmtpCatchAll: result.isNotSmtpCatchAll,
        isNotDisposable: result.isNotDisposable,
        gravatar: result.gravatar,
        githubUsername: result.githubUsername,
        facebook: result.facebook
      },
      message: `Verified **${result.email}** — trust score: **${result.trustRate}%** (${status}). MX exists: ${result.mxExists}, SMTP exists: ${result.smtpExists}, not disposable: ${result.isNotDisposable}.`
    };
  })
  .build();

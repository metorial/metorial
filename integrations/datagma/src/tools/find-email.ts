import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find a verified work email address for a person based on their full name and company. All emails are verified in real-time with Neverbounce and Usebouncer.
Returns the email address along with validity status, SMTP check results, and catch-all detection. Can also return just the email domain if a full email is not needed.`,
  instructions: [
    'Provide the full name of the person and their company name or domain.',
    'Optionally provide a LinkedIn company slug to improve accuracy by ~20%.',
    'Set resultType to "full_email" for the full address or "domain_only" for just the domain.',
    "Provide the person's country/location to improve accuracy for regional domains."
  ],
  constraints: [
    'Rate limited to 10 requests per second.',
    '"Most Probable Email" results do not incur credit charges.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fullName: z.string().describe('Full name of the person to find the email for'),
      company: z.string().describe('Company name or domain (e.g. "Google" or "google.com")'),
      resultType: z
        .enum(['full_email', 'domain_only'])
        .optional()
        .default('full_email')
        .describe('Whether to return the full email address or just the domain'),
      country: z
        .string()
        .optional()
        .describe(
          'Person\'s location to improve accuracy for regional domains (e.g. "Japan", "France", "General")'
        ),
      linkedinCompanySlug: z
        .string()
        .optional()
        .describe(
          'LinkedIn company URL slug to improve match rate (e.g. "google" from linkedin.com/company/google)'
        )
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Found email address'),
      emailDomain: z.string().optional().describe('Email domain'),
      status: z.string().optional().describe('Verification status of the email'),
      mostProbableEmail: z
        .string()
        .optional()
        .describe('Most probable email if exact match not found (no credit charge)'),
      patterns: z.any().optional().describe('Email patterns detected for the company'),
      mxFound: z.any().optional().describe('MX record lookup results'),
      smtpCheck: z.any().optional().describe('SMTP verification results'),
      catchAll: z.any().optional().describe('Whether the email domain is a catch-all'),
      flags: z.any().optional().describe('Additional flags about the result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let stepValue = ctx.input.resultType === 'domain_only' ? 2 : 3;

    let result = await client.findEmail({
      fullName: ctx.input.fullName,
      company: ctx.input.company,
      findEmailV2Step: stepValue,
      findEmailV2Country: ctx.input.country,
      linkedInSlug: ctx.input.linkedinCompanySlug
    });

    let foundEmail = result?.email || result?.mostProbableEmail || 'not found';

    return {
      output: {
        email: result?.email,
        emailDomain: result?.emailDomain,
        status: result?.status,
        mostProbableEmail: result?.mostProbableEmail,
        patterns: result?.patterns,
        mxFound: result?.mxfound,
        smtpCheck: result?.smtpCheck,
        catchAll: result?.cachAll,
        flags: result?.flags
      },
      message: `Email lookup for **${ctx.input.fullName}** at **${ctx.input.company}**: ${foundEmail}${result?.status ? ` (status: ${result.status})` : ''}.`
    };
  })
  .build();

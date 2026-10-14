import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findVerifiedEmail = SlateTool.create(spec, {
  name: 'Find Verified Work Email',
  key: 'find_verified_email',
  description:
    'Find a verified work email using Datagma’s current email-finding API. Identify a person by full name or first and last name, and their company by name, domain, or LinkedIn company URL. Returns the email, domain, and verification checks.',
  instructions: [
    'Provide fullName or both firstName and lastName.',
    'Provide company or linkedinCompanyUrl. A LinkedIn company URL can identify the company when its domain is unknown.',
    'Use find_email when you need domain-only results or a country hint.'
  ],
  constraints: ['Rate limited to 10 requests per second.'],
  docs: [
    {
      name: 'Find Work Verified Email',
      url: 'https://datagmaapi.readme.io/reference/ingressservice_findemailv8'
    }
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      fullName: z
        .string()
        .optional()
        .describe('Full name; alternative to firstName and lastName'),
      firstName: z
        .string()
        .optional()
        .describe('First name; use with lastName when fullName is absent'),
      lastName: z
        .string()
        .optional()
        .describe('Last name; use with firstName when fullName is absent'),
      company: z
        .string()
        .optional()
        .describe('Company name or domain, such as Algolia or algolia.com'),
      linkedinCompanyUrl: z
        .string()
        .optional()
        .describe('LinkedIn company URL or slug; alternative to company')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Email address found'),
      emailDomain: z.string().optional().describe('Company email domain'),
      status: z.string().optional().describe('Provider email verification status'),
      patterns: z
        .array(z.string())
        .optional()
        .describe('Email patterns found for the company'),
      mxFound: z.boolean().optional().describe('Whether mail exchange records were found'),
      smtpCheck: z.boolean().optional().describe('SMTP verification result'),
      catchAll: z
        .boolean()
        .optional()
        .describe('Whether the domain accepts mail for all recipients')
    })
  )
  .handleInvocation(async ctx => {
    if (
      !ctx.input.fullName?.trim() &&
      !(ctx.input.firstName?.trim() && ctx.input.lastName?.trim())
    ) {
      throw createApiServiceError('Provide fullName or both firstName and lastName.');
    }
    if (!ctx.input.company?.trim() && !ctx.input.linkedinCompanyUrl?.trim()) {
      throw createApiServiceError('Provide a company name, domain, or linkedinCompanyUrl.');
    }

    let client = new Client(ctx.auth.token);
    let result = await client.findVerifiedEmail({
      fullName: ctx.input.fullName,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      company: ctx.input.company,
      linkedInSlug: ctx.input.linkedinCompanyUrl
    });
    let personName = ctx.input.fullName || `${ctx.input.firstName} ${ctx.input.lastName}`;

    return {
      output: {
        email: result?.email,
        emailDomain: result?.emailDomain,
        status: result?.status,
        patterns: result?.patterns,
        mxFound: result?.mxfound,
        smtpCheck: result?.smtpCheck,
        catchAll: result?.cachAll
      },
      message: `Work email lookup for **${personName}**: ${result?.email || 'no email found'}${result?.status ? ` (status: ${result.status})` : ''}.`
    };
  })
  .build();

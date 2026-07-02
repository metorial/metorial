import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichContact = SlateTool.create(spec, {
  name: 'Enrich Contact',
  key: 'enrich_contact',
  description: `Start an enrichment request for an individual contact. Finds verified email addresses, phone numbers, LinkedIn profile data, and company firmographics.

Provide one of the following to identify the contact (in order of accuracy):
- **LinkedIn profile URL** (most accurate)
- **Full name + company name or domain**
- **Email address**

The enrichment is asynchronous — use the **Get Enrichment Result** tool to retrieve results once processing completes, or configure a webhook callback URL to receive results automatically.`,
  instructions: [
    'For best results, provide a LinkedIn profile URL when available.',
    'Set enrichmentLevel to "full" to get both emails and phone numbers, "partial" for emails only, "phone" for phone numbers only, or "none" for LinkedIn profile data only.',
    'Use callbackUrl to receive results via webhook instead of polling.'
  ],
  constraints: [
    'Rate limit: 15 requests per second.',
    'Credits are consumed based on enrichment level: 1 credit for profile data, 2 for emails, 5 for phone numbers.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      profileUrl: z
        .string()
        .optional()
        .describe(
          'LinkedIn profile URL (e.g., https://www.linkedin.com/in/johndoe). Most accurate identification method.'
        ),
      fullName: z
        .string()
        .optional()
        .describe(
          'Full name of the contact. Must be combined with companyName or companyDomain.'
        ),
      companyName: z
        .string()
        .optional()
        .describe('Company name where the contact works. Used with fullName.'),
      companyDomain: z
        .string()
        .optional()
        .describe('Company domain (e.g., acme.com). Used with fullName.'),
      email: z
        .string()
        .optional()
        .describe('Email address of the contact. Can be used as the sole identifier.'),
      enrichmentLevel: z
        .enum(['none', 'partial', 'phone', 'full'])
        .default('partial')
        .describe(
          'Level of enrichment: "none" = LinkedIn profile only, "partial" = profile + emails, "phone" = profile + phone numbers, "full" = profile + emails + phone numbers.'
        ),
      acceptWork: z
        .boolean()
        .optional()
        .describe('Whether to include work email addresses in results. Defaults to true.'),
      acceptPersonal: z
        .boolean()
        .optional()
        .describe('Whether to include personal email addresses in results. Defaults to true.'),
      callbackUrl: z
        .string()
        .optional()
        .describe(
          'Webhook URL to receive results when enrichment completes, overriding the default webhook URL.'
        )
    })
  )
  .output(
    z.object({
      revealId: z
        .number()
        .describe('Unique ID of the enrichment request. Use this to retrieve results later.'),
      status: z
        .string()
        .describe('Current status of the enrichment request (e.g., "queued", "resolving").'),
      isComplete: z.boolean().describe('Whether the enrichment has completed processing.'),
      message: z.string().describe('Status message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.startIndividualReveal({
      profileUrl: ctx.input.profileUrl,
      fullName: ctx.input.fullName,
      company: ctx.input.companyName,
      domain: ctx.input.companyDomain,
      email: ctx.input.email,
      enrichmentLevel: ctx.input.enrichmentLevel,
      acceptWork: ctx.input.acceptWork,
      acceptPersonal: ctx.input.acceptPersonal,
      callbackUrl: ctx.input.callbackUrl
    });

    ctx.info({
      message: 'Individual reveal started',
      revealId: result.data.id,
      status: result.data.status
    });

    return {
      output: {
        revealId: result.data.id,
        status: result.data.status,
        isComplete: result.data.is_complete,
        message: result.status.message
      },
      message: `Enrichment request started with ID **${result.data.id}**. Status: **${result.data.status}**. Use the "Get Enrichment Result" tool to retrieve results once processing completes.`
    };
  })
  .build();

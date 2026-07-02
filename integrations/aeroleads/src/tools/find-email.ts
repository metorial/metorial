import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find the business email address of a prospect using their first name, last name, and company domain. Returns the email along with a confidence score indicating verification status: **1.0** = confirmed, **0.5** = server accepts all (may be correct), **0.1** = unsure.`,
  constraints: ['Each API call consumes 1 credit from your AeroLeads account.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the prospect.'),
      lastName: z.string().describe('Last name of the prospect.'),
      companyDomain: z
        .string()
        .describe(
          'The company domain (e.g. "example.com"). Do not include "https://" or "www." prefixes.'
        )
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('The found business email address.'),
      confidence: z
        .number()
        .optional()
        .describe(
          'Confidence score: 1.0 = confirmed, 0.5 = server accepts all pings, 0.1 = unsure.'
        ),
      rawResponse: z
        .any()
        .optional()
        .describe('Full raw response from the API for additional fields.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCompanyEmail(
      ctx.input.firstName,
      ctx.input.lastName,
      ctx.input.companyDomain
    );

    let email = result.email || undefined;
    let confidence = result.confidence !== undefined ? Number(result.confidence) : undefined;

    let output = {
      email,
      confidence,
      rawResponse: result
    };

    let confidenceLabel = 'unknown';
    if (confidence === 1.0) confidenceLabel = 'confirmed';
    else if (confidence === 0.5) confidenceLabel = 'possible (server accepts all)';
    else if (confidence === 0.1) confidenceLabel = 'unsure';
    else if (confidence !== undefined) confidenceLabel = `${confidence}`;

    let message = email
      ? `Found email **${email}** for ${ctx.input.firstName} ${ctx.input.lastName} (confidence: ${confidenceLabel}).`
      : `No email found for ${ctx.input.firstName} ${ctx.input.lastName} at ${ctx.input.companyDomain}.`;

    return {
      output,
      message
    };
  })
  .build();

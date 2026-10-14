import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getResult, getText } from '../lib/response';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description:
    'Find a prospect’s business email using their first name, last name, and company domain. Returns the email and any verification status or confidence supplied by AeroLeads.',
  constraints: ['Lookups may consume credits from your AeroLeads account.'],
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
          'Confidence score, when supplied by AeroLeads. No score is inferred from the email status.'
        ),
      status: z.string().optional().describe('Email validity status supplied by AeroLeads.'),
      name: z.string().optional().describe('Prospect name supplied by AeroLeads.'),
      companyDomain: z.string().optional().describe('The company domain used for the lookup.'),
      rawResponse: z
        .any()
        .optional()
        .describe('Full raw response from the API for additional fields.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getCompanyEmail(
      ctx.input.firstName,
      ctx.input.lastName,
      ctx.input.companyDomain
    );
    let result = getResult(response);

    let email = getText(result.email, result.address);
    let score = result.confidence;
    let parsedScore =
      typeof score === 'number' || (typeof score === 'string' && score.trim())
        ? Number(score)
        : undefined;
    let confidence =
      parsedScore !== undefined && Number.isFinite(parsedScore) ? parsedScore : undefined;
    let status = getText(result.email_status, result.status);

    let output = {
      email,
      confidence,
      status,
      name: getText(result.name),
      companyDomain: getText(result.company_url, result.domain) ?? ctx.input.companyDomain,
      rawResponse: response
    };

    let details = status ? ` (status: ${status})` : '';
    if (confidence !== undefined) details += ` (confidence: ${confidence})`;
    let message = email
      ? `Found email **${email}** for ${ctx.input.firstName} ${ctx.input.lastName}${details}.`
      : `No email found for ${ctx.input.firstName} ${ctx.input.lastName} at ${ctx.input.companyDomain}.`;

    return {
      output,
      message
    };
  })
  .build();

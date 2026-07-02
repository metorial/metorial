import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find a prospect's most likely business email address given a domain, first name, and last name. Each successful lookup consumes account credits.`,
  constraints: ['Each lookup consumes GetProspect account credits.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain name (e.g. "example.com")'),
      firstName: z.string().describe('First name of the prospect'),
      lastName: z.string().describe('Last name of the prospect')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('The found email address'),
      status: z
        .string()
        .optional()
        .describe('Status of the lookup (e.g. "found", "not_found")'),
      confidence: z.number().optional().describe('Confidence score of the found email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.findEmail({
      domain: ctx.input.domain,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    });

    return {
      output: {
        email: result.email,
        status: result.status,
        confidence: result.confidence
      },
      message: result.email
        ? `Found email **${result.email}** for ${ctx.input.firstName} ${ctx.input.lastName} at ${ctx.input.domain}.`
        : `No email found for ${ctx.input.firstName} ${ctx.input.lastName} at ${ctx.input.domain}.`
    };
  })
  .build();

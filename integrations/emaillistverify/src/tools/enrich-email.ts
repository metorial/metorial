import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let enrichEmail = SlateTool.create(spec, {
  name: 'Enrich Email',
  key: 'enrich_email',
  description: `Get enriched profile data for an email address including verification status, full name, gender, email service provider (ESP), and whether it is a free or no-reply address.

Useful for CRM enrichment, lead scoring, and contact segmentation.`,
  instructions: ['Provide the full email address to enrich.'],
  constraints: ['Each enrichment request consumes one credit from your account balance.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to enrich'),
      timeout: z
        .number()
        .optional()
        .describe('Maximum seconds to attempt verification (defaults to 30)')
    })
  )
  .output(
    z.object({
      email: z.string().describe('The email address that was enriched'),
      status: z.string().describe('Verification status of the email'),
      fullName: z.string().nullable().describe('Full name associated with the email address'),
      gender: z.string().nullable().describe('Detected gender based on the name'),
      esp: z.string().nullable().describe('Email service provider (e.g., Gmail, Outlook)'),
      free: z.boolean().nullable().describe('Whether the email is from a free provider'),
      noreply: z.boolean().nullable().describe('Whether the email is a no-reply address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyEmailDetailed(ctx.input.email, ctx.input.timeout);

    return {
      output: {
        email: result.email,
        status: result.status,
        fullName: result.fullName,
        gender: result.gender,
        esp: result.esp,
        free: result.free,
        noreply: result.noreply
      },
      message: `Enrichment of **${result.email}**: status is **${result.status}**${result.fullName ? `, name: ${result.fullName}` : ''}${result.esp ? `, ESP: ${result.esp}` : ''}`
    };
  })
  .build();

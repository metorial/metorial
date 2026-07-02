import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify an email address via SMTP verification. Returns the email status indicating whether the email is valid, invalid, or unknown.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address to verify')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Verified email address'),
      status: z
        .string()
        .optional()
        .describe('Verification status (e.g., valid, invalid, unknown)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.verifyEmail({ email: ctx.input.email });

    return {
      output: {
        email: result.email,
        status: result.status
      },
      message: `Email **${ctx.input.email}** verification status: **${result.status ?? 'unknown'}**.`
    };
  })
  .build();

export let findEmail = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find a person's professional email address by their full name and company. Provide at least a company domain or company name along with the person's full name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fullName: z.string().describe("Person's full name"),
      companyDomain: z.string().optional().describe('Company domain (e.g., "google.com")'),
      companyName: z.string().optional().describe('Company name (e.g., "Google")')
    })
  )
  .output(
    z.object({
      email: z.string().optional().describe('Found email address'),
      status: z.string().optional().describe('Email verification status'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      companyDomain: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.findEmail({
      fullName: ctx.input.fullName,
      companyDomain: ctx.input.companyDomain,
      companyName: ctx.input.companyName
    });

    return {
      output: {
        email: result.email,
        status: result.status,
        firstName: result.first_name,
        lastName: result.last_name,
        companyDomain: result.company_domain
      },
      message: result.email
        ? `Found email **${result.email}** for **${ctx.input.fullName}** (status: ${result.status ?? 'unknown'}).`
        : `No email found for **${ctx.input.fullName}**.`
    };
  })
  .build();

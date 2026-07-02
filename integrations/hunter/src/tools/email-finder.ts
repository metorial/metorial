import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailFinder = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find the most likely professional email address for a person given their name and domain/company, or their LinkedIn handle. Returns the email with a confidence score and verification status.`,
  instructions: [
    "Provide either a domain or company name along with the person's name (first+last or full name).",
    'Alternatively, provide a LinkedIn handle to find the email.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().optional().describe('Domain of the company (e.g., "stripe.com")'),
      companyName: z.string().optional().describe('Company name to search'),
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().optional().describe('Last name of the person'),
      fullName: z
        .string()
        .optional()
        .describe('Full name of the person (alternative to firstName + lastName)'),
      linkedinHandle: z
        .string()
        .optional()
        .describe('LinkedIn handle or profile URL of the person'),
      maxDuration: z
        .number()
        .min(3)
        .max(20)
        .optional()
        .describe('Max time in seconds (3-20) for the search to refine results')
    })
  )
  .output(
    z.object({
      email: z.string().nullable().describe('The email address found'),
      score: z.number().nullable().describe('Confidence score from 0 to 100'),
      firstName: z.string().nullable().describe('First name of the person'),
      lastName: z.string().nullable().describe('Last name of the person'),
      position: z.string().nullable().describe('Job position of the person'),
      company: z.string().nullable().describe('Company name'),
      domain: z.string().nullable().describe('Domain used for the search'),
      linkedin: z.string().nullable().optional().describe('LinkedIn URL'),
      twitter: z.string().nullable().optional().describe('Twitter handle'),
      phoneNumber: z.string().nullable().optional().describe('Phone number'),
      verificationStatus: z.string().nullable().describe('Verification status of the email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.findEmail({
      domain: ctx.input.domain,
      company: ctx.input.companyName,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      fullName: ctx.input.fullName,
      linkedinHandle: ctx.input.linkedinHandle,
      maxDuration: ctx.input.maxDuration
    });

    let data = result.data;

    return {
      output: {
        email: data.email ?? null,
        score: data.score ?? null,
        firstName: data.first_name ?? null,
        lastName: data.last_name ?? null,
        position: data.position ?? null,
        company: data.company ?? null,
        domain: data.domain ?? null,
        linkedin: data.linkedin ?? null,
        twitter: data.twitter ?? null,
        phoneNumber: data.phone_number ?? null,
        verificationStatus: data.verification?.status ?? null
      },
      message: data.email
        ? `Found email **${data.email}** with confidence score **${data.score}** (${data.verification?.status ?? 'unknown'}).`
        : `No email found for the given criteria.`
    };
  })
  .build();

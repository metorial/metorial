import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, optionalNumber, optionalRow, optionalText, row } from '../lib/client';
import { spec } from '../spec';

export let emailFinder = SlateTool.create(spec, {
  name: 'Find Email',
  key: 'find_email',
  description: `Find the most likely professional email address for a person given their name and domain/company, or their LinkedIn handle. Returns the email with a confidence score and verification status.`,
  instructions: [
    "Provide either a domain or company name along with the person's name (first+last or full name).",
    'Alternatively, provide a LinkedIn handle to find the email.'
  ],
  constraints: [
    'This lookup uses account credits and can save the found address as a lead unless auto-save is disabled in the account settings.'
  ],
  tags: {
    readOnly: false
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
    const result = await new Client({ token: ctx.auth.token }).findEmail({
      domain: ctx.input.domain,
      company: ctx.input.companyName,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      fullName: ctx.input.fullName,
      linkedinHandle: ctx.input.linkedinHandle,
      maxDuration: ctx.input.maxDuration
    });
    const data = row(result.data),
      verification = optionalRow(data.verification);
    return {
      output: {
        email: optionalText(data.email) ?? null,
        score: optionalNumber(data.score) ?? null,
        firstName: optionalText(data.first_name) ?? null,
        lastName: optionalText(data.last_name) ?? null,
        position: optionalText(data.position) ?? null,
        company: optionalText(data.company) ?? null,
        domain: optionalText(data.domain) ?? null,
        linkedin: optionalText(data.linkedin_url ?? data.linkedin) ?? null,
        twitter: optionalText(data.twitter) ?? null,
        phoneNumber: optionalText(data.phone_number) ?? null,
        verificationStatus: optionalText(verification.status) ?? null
      },
      message: optionalText(data.email)
        ? `Found professional email **${optionalText(data.email)}**.`
        : 'No email found for the given criteria.'
    };
  })
  .build();

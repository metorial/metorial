import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  optionalNumber,
  optionalRow,
  optionalText,
  row,
  rows,
  text
} from '../lib/client';
import { spec } from '../spec';

let emailSchema = z.object({
  value: z.string().describe('The email address'),
  type: z.string().nullable().describe('Type of email: personal or generic'),
  confidence: z.number().nullable().describe('Confidence score from 0 to 100'),
  firstName: z.string().nullable().describe('First name of the contact'),
  lastName: z.string().nullable().describe('Last name of the contact'),
  position: z.string().nullable().describe('Job position of the contact'),
  seniority: z.string().nullable().describe('Seniority level of the contact'),
  department: z.string().nullable().describe('Department of the contact'),
  linkedin: z.string().nullable().optional().describe('LinkedIn URL'),
  twitter: z.string().nullable().optional().describe('Twitter handle'),
  phoneNumber: z.string().nullable().optional().describe('Phone number'),
  verificationStatus: z.string().nullable().optional().describe('Email verification status')
});

export let domainSearch = SlateTool.create(spec, {
  name: 'Domain Search',
  key: 'domain_search',
  description: `Search for all email addresses associated with a domain or company name. Returns contact details including names, positions, departments, seniority levels, confidence scores, and verification status. Results can be filtered by email type, seniority, department, and more.`,
  constraints: [
    'Requires either a domain or company name.',
    'Maximum 100 results per request. Use offset for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe(
          'Domain name to search (e.g., "stripe.com"). Either domain or companyName is required.'
        ),
      companyName: z
        .string()
        .optional()
        .describe('Company name to search. Either domain or companyName is required.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of results to return (1-100, default 10)'),
      offset: z.number().optional().describe('Offset for pagination'),
      type: z.enum(['personal', 'generic']).optional().describe('Filter by email type'),
      seniority: z
        .string()
        .optional()
        .describe('Filter by seniority level (e.g., "senior", "executive", "junior")'),
      department: z
        .string()
        .optional()
        .describe('Filter by department (e.g., "executive", "engineering", "marketing")'),
      verificationStatus: z
        .enum(['valid', 'invalid', 'accept_all', 'unknown'])
        .optional()
        .describe('Filter by verification status'),
      location: z
        .string()
        .optional()
        .describe(
          'Comma-separated ISO two-letter country codes, mapped to nested location include filters (for example US,FR). Free-text locations are unsupported.'
        )
    })
  )
  .output(
    z.object({
      domain: z.string().describe('The domain searched'),
      organization: z.string().nullable().describe('Organization name'),
      emailCount: z
        .number()
        .optional()
        .describe('Provider-reported total matching email addresses, when supplied'),
      returnedCount: z.number().describe('Email addresses returned in this page'),
      emails: z.array(emailSchema).describe('List of email addresses found'),
      pattern: z
        .string()
        .nullable()
        .optional()
        .describe('Most common email pattern for this domain')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).domainSearch({
      domain: ctx.input.domain,
      company: ctx.input.companyName,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      type: ctx.input.type,
      seniority: ctx.input.seniority,
      department: ctx.input.department,
      verificationStatus: ctx.input.verificationStatus,
      location: ctx.input.location
    });
    const data = row(result.data);
    const emails = rows(data.emails).map(e => ({
      value: text(e.value, 'returned email'),
      type: optionalText(e.type) ?? null,
      confidence: optionalNumber(e.confidence) ?? null,
      firstName: optionalText(e.first_name) ?? null,
      lastName: optionalText(e.last_name) ?? null,
      position: optionalText(e.position) ?? null,
      seniority: optionalText(e.seniority) ?? null,
      department: optionalText(e.department) ?? null,
      linkedin: optionalText(e.linkedin) ?? null,
      twitter: optionalText(e.twitter) ?? null,
      phoneNumber: optionalText(e.phone_number) ?? null,
      verificationStatus: optionalText(optionalRow(e.verification).status) ?? null
    }));
    return {
      output: {
        domain: text(data.domain, 'returned domain'),
        organization: optionalText(data.organization) ?? null,
        emailCount: optionalNumber(result.meta.results),
        returnedCount: emails.length,
        emails,
        pattern: optionalText(data.pattern) ?? null
      },
      message: `Retrieved **${emails.length}** email addresses for **${text(data.domain)}**.`
    };
  })
  .build();

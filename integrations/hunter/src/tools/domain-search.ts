import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      location: z.string().optional().describe('Filter by location of the contacts')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('The domain searched'),
      organization: z.string().nullable().describe('Organization name'),
      emailCount: z.number().describe('Total number of emails found'),
      emails: z.array(emailSchema).describe('List of email addresses found'),
      pattern: z
        .string()
        .nullable()
        .optional()
        .describe('Most common email pattern for this domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.domainSearch({
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

    let data = result.data;
    let emails = (data.emails || []).map((e: any) => ({
      value: e.value,
      type: e.type ?? null,
      confidence: e.confidence ?? null,
      firstName: e.first_name ?? null,
      lastName: e.last_name ?? null,
      position: e.position ?? null,
      seniority: e.seniority ?? null,
      department: e.department ?? null,
      linkedin: e.linkedin ?? null,
      twitter: e.twitter ?? null,
      phoneNumber: e.phone_number ?? null,
      verificationStatus: e.verification?.status ?? null
    }));

    return {
      output: {
        domain: data.domain ?? ctx.input.domain ?? '',
        organization: data.organization ?? null,
        emailCount: data.emails?.length ?? 0,
        emails,
        pattern: data.pattern ?? null
      },
      message: `Found **${emails.length}** email addresses for **${data.domain || ctx.input.companyName}**.`
    };
  })
  .build();

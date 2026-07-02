import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

let emailSchema = z.object({
  email: z.string().describe('The email address'),
  firstName: z.string().nullable().optional().describe('First name of the person'),
  lastName: z.string().nullable().optional().describe('Last name of the person'),
  fullName: z.string().nullable().optional().describe('Full name of the person'),
  position: z.string().nullable().optional().describe('Job position'),
  seniority: z.string().nullable().optional().describe('Seniority level'),
  department: z.string().nullable().optional().describe('Department'),
  country: z.string().nullable().optional().describe('Country code'),
  gender: z.string().nullable().optional().describe('Gender'),
  twitter: z.string().nullable().optional().describe('Twitter handle'),
  linkedin: z.string().nullable().optional().describe('LinkedIn profile URL'),
  score: z.number().nullable().optional().describe('Confidence score (0-100)'),
  type: z.string().nullable().optional().describe('Email type (personal/generic)')
});

export let domainSearch = SlateTool.create(spec, {
  name: 'Domain Search',
  key: 'domain_search',
  description: `Search for professional email addresses associated with a domain or company. Returns organization data along with the email addresses found and information about the people who own those addresses. Can filter by department or country.`,
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
          'Domain name to search (e.g. "stripe.com"). Preferred over company name for better results.'
        ),
      company: z
        .string()
        .optional()
        .describe('Company name to search. Domain is preferred if available.'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z
        .number()
        .optional()
        .describe('Max number of email addresses to return per page'),
      country: z
        .string()
        .optional()
        .describe('Two-letter country code to filter results (e.g. "US")'),
      department: z
        .string()
        .optional()
        .describe('Filter by department (e.g. "engineering", "finance", "hr")')
    })
  )
  .output(
    z.object({
      organizationName: z.string().nullable().optional().describe('Organization name'),
      organizationDomain: z.string().nullable().optional().describe('Organization domain'),
      emails: z.array(emailSchema).describe('List of email addresses found'),
      totalEmails: z.number().optional().describe('Total number of emails found'),
      country: z.string().nullable().optional().describe('Country of the organization'),
      lastUpdated: z.string().nullable().optional().describe('Last time the data was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.domainSearch({
      domain: ctx.input.domain,
      company: ctx.input.company,
      page: ctx.input.page,
      limit: ctx.input.limit,
      country: ctx.input.country,
      department: ctx.input.department
    });

    let data = result.data || {};
    let emails = (data.emails || []).map((e: any) => ({
      email: e.email,
      firstName: e.first_name,
      lastName: e.last_name,
      fullName: e.full_name,
      position: e.position,
      seniority: e.seniority,
      department: e.department,
      country: e.country,
      gender: e.gender,
      twitter: e.twitter,
      linkedin: e.linkedin,
      score: e.score,
      type: e.type
    }));

    return {
      output: {
        organizationName: data.organization?.name || data.organization,
        organizationDomain: data.organization?.website_url || ctx.input.domain,
        emails,
        totalEmails: data.total || emails.length,
        country: data.country,
        lastUpdated: data.last_updated
      },
      message: `Found **${emails.length}** email addresses for **${ctx.input.domain || ctx.input.company}**.`
    };
  })
  .build();

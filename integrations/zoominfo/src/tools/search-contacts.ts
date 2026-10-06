import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, pagination, records } from '../lib/client';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search ZoomInfo's database of business contacts using various criteria. Returns contact previews including names, job titles, companies, and data availability indicators. **Does not consume credits.** Use the returned contact IDs with the Enrich Contact tool to retrieve full profiles with emails and phone numbers.`,
  instructions: [
    'Searches are free and do not consume credits. Use this to identify contacts before enriching.',
    'Results include data availability flags (hasEmail, hasDirectPhone, etc.) to help you decide which contacts to enrich.'
  ],
  constraints: [
    'Returns up to 100 contacts per page (provider request and record limits still apply).',
    'Does not return email addresses or phone numbers — use Enrich Contacts for that.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.string().optional().describe('ZoomInfo person ID'),
      emailAddress: z.string().optional().describe('Email address to search for'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      fullName: z.string().optional().describe('Contact full name'),
      jobTitle: z.string().optional().describe('Job title keyword (partial match)'),
      managementLevel: z
        .string()
        .optional()
        .describe('Management level (e.g., "C-Level", "VP-Level", "Director", "Manager")'),
      department: z.string().optional().describe('Department name'),
      companyId: z.number().optional().describe('ZoomInfo company ID'),
      companyName: z.string().optional().describe('Company name'),
      companyWebsite: z.string().optional().describe('Company website domain'),
      country: z.string().optional().describe('Country name or code'),
      state: z.string().optional().describe('State or province'),
      city: z
        .string()
        .optional()
        .describe(
          'City filter for legacy Enterprise API connections; current GTM connections use metroRegion.'
        ),
      metroRegion: z
        .string()
        .optional()
        .describe('Current GTM metro region value from Lookup Data'),
      industryCodes: z
        .string()
        .optional()
        .describe('Current GTM industry codes from Lookup Data; comma-separated'),
      contactAccuracyScoreMin: z
        .number()
        .min(70)
        .max(99)
        .optional()
        .describe('Minimum contact accuracy score (70-99)'),
      page: z.number().min(1).optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (1-100, default 25)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (e.g., "contactAccuracyScore", "-lastName", "companyName")')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of contact preview records'),
      totalResults: z.number().optional().describe('Total number of matching contacts'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages'),
      returnedCount: z.number().optional().describe('Number of records in this response')
    })
  )
  .handleInvocation(async ctx => {
    const client = Client.fromContext(ctx);

    let { page, pageSize, sort, ...searchParams } = ctx.input;

    let result = await client.searchContacts(searchParams, page, pageSize, sort);

    const contacts = records(result);
    const { totalResults, currentPage, totalPages } = pagination(result);

    return {
      output: {
        contacts,
        totalResults,
        currentPage,
        totalPages,
        returnedCount: contacts.length
      },
      message: `Found **${totalResults ?? contacts.length}** contacts${currentPage ? ` (page ${currentPage}${totalPages ? ` of ${totalPages}` : ''})` : ''}.`
    };
  })
  .build();

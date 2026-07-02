import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
    'Returns up to 100 contacts per page (max 10,000 total results). For larger result sets, use bulk search.',
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
      city: z.string().optional().describe('City name'),
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
        .array(z.record(z.string(), z.any()))
        .describe('Array of contact preview records'),
      totalResults: z.number().optional().describe('Total number of matching contacts'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let { page, pageSize, sort, ...searchParams } = ctx.input;

    let result = await client.searchContacts(searchParams, page, pageSize, sort);

    let contacts: any[] = [];
    let totalResults: number | undefined;
    let currentPage: number | undefined;
    let totalPages: number | undefined;

    if (ctx.config.apiVersion === 'new') {
      contacts = result.data || [];
      totalResults = result.meta?.totalResults;
      currentPage = result.meta?.page?.number;
      totalPages = result.meta?.page?.total;
    } else {
      contacts = result.data || result.result || [];
      totalResults = result.totalResults;
      currentPage = result.currentPage;
      totalPages = result.totalPages;
    }

    return {
      output: { contacts, totalResults, currentPage, totalPages },
      message: `Found **${totalResults ?? contacts.length}** contacts${currentPage ? ` (page ${currentPage}${totalPages ? ` of ${totalPages}` : ''})` : ''}.`
    };
  })
  .build();

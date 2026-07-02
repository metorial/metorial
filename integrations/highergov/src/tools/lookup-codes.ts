import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupCodes = SlateTool.create(spec, {
  name: 'Lookup Codes',
  key: 'lookup_codes',
  description: `Look up NAICS (North American Industry Classification System) codes, PSC (Product Service Codes), and grant program (CFDA/Assistance Listing) details. Use this to resolve code descriptions or find the right code for filtering other searches.`,
  instructions: [
    'Set codeType to "naics" for industry codes, "psc" for product/service codes, or "grant_program" for assistance listing programs.',
    'Provide the specific code to look up its details, or omit to browse all codes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      codeType: z.enum(['naics', 'psc', 'grant_program']).describe('Type of code to look up'),
      code: z
        .string()
        .optional()
        .describe(
          'Specific code to look up (e.g. "541330" for NAICS, "8440" for PSC, "93.778" for grant program)'
        ),
      agencyKey: z
        .number()
        .optional()
        .describe('Filter grant programs by agency key (grant_program only)'),
      ordering: z.string().optional().describe('Sort order for results'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      codes: z.array(z.record(z.string(), z.unknown())).describe('List of code records'),
      totalCount: z.number().describe('Total number of matching codes'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let response: any;
    if (input.codeType === 'naics') {
      response = await client.getNaicsCodes({
        naicsCode: input.code,
        ordering: input.ordering,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    } else if (input.codeType === 'psc') {
      response = await client.getPscCodes({
        pscCode: input.code,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    } else {
      response = await client.getGrantPrograms({
        cfdaProgramNumber: input.code,
        agencyKey: input.agencyKey,
        pageNumber: input.pageNumber,
        pageSize: input.pageSize
      });
    }

    return {
      output: {
        codes: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** ${input.codeType} codes (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSearchResult = SlateTool.create(spec, {
  name: 'Get Search Result',
  key: 'get_search_result',
  description: `Retrieve the result of a single search (email search, email verification, or domain scan) using its search ID. Results include found email addresses, confidence levels, verification status, and MX provider information. A search status of **DEBITED** means the search is complete.`,
  instructions: [
    'The search ID is returned when submitting a search via the Search Email, Verify Email, or Scan Domain tools.',
    'Statuses: NONE, SCHEDULED, IN_PROGRESS mean still processing; DEBITED means complete with results.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      searchId: z.string().describe('The search ID returned when the search was submitted')
    })
  )
  .output(
    z.object({
      searchId: z.string().optional().describe('The search ID'),
      status: z
        .string()
        .optional()
        .describe('Processing status (NONE, SCHEDULED, IN_PROGRESS, DEBITED, etc.)'),
      email: z.string().optional().describe('The found or verified email address'),
      emails: z.array(z.any()).optional().describe('Array of found emails for domain scans'),
      certainty: z
        .string()
        .optional()
        .describe('Confidence level (ultra_sure, probable, not_found, undeliverable)'),
      firstname: z.string().optional().describe('First name of the person if found'),
      lastname: z.string().optional().describe('Last name of the person if found'),
      mxProvider: z.string().optional().describe('Email MX provider'),
      gender: z.string().optional().describe('Inferred gender'),
      raw: z.any().optional().describe('Full raw result from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSearchResult(ctx.input.searchId);

    let item = result?.item || result?.items?.[0] || result;

    return {
      output: {
        searchId: item?._id || ctx.input.searchId,
        status: item?.status,
        email: item?.email,
        emails: item?.emails,
        certainty: item?.certainty,
        firstname: item?.firstname,
        lastname: item?.lastname,
        mxProvider: item?.mxProvider,
        gender: item?.gender,
        raw: item
      },
      message:
        item?.status === 'DEBITED'
          ? `Search complete. ${item?.email ? `Email: **${item.email}** (${item.certainty || 'unknown confidence'})` : 'No email found.'}`
          : `Search status: **${item?.status || 'unknown'}**. ${['NONE', 'SCHEDULED', 'IN_PROGRESS'].includes(item?.status) ? 'Still processing, try again shortly.' : ''}`
    };
  })
  .build();

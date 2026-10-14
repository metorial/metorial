import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSearchResult = SlateTool.create(spec, {
  name: 'Get Search Result',
  key: 'get_search_result',
  description: `Retrieve a search result (email search, email verification, or domain scan) using its search ID. Results include found email addresses, confidence levels, verification status, and MX provider information. **FOUND** or **DEBITED** indicates a completed search with a result.`,
  instructions: [
    'The search ID is returned when submitting a search via the Search Email, Verify Email, or Scan Domain tools.',
    'Statuses NONE, SCHEDULED and IN_PROGRESS mean processing. FOUND or DEBITED means a result was found; NOT_FOUND or DEBITED_NOT_FOUND means the search finished without a result.'
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
    let details = item?.results || item;
    let emails = details?.emails;
    let primaryEmail = emails?.[0];
    let email = details?.email || primaryEmail?.email;
    let certainty = details?.certainty || primaryEmail?.certainty;

    return {
      output: {
        searchId: item?._id || ctx.input.searchId,
        status: item?.status,
        email,
        emails,
        certainty,
        firstname: details?.firstname,
        lastname: details?.lastname,
        mxProvider: details?.mxProvider || primaryEmail?.mxProvider,
        gender: details?.gender,
        raw: item
      },
      message: ['FOUND', 'DEBITED', 'NOT_FOUND', 'DEBITED_NOT_FOUND'].includes(item?.status)
        ? `Search complete. ${email ? `Email: **${email}** (${certainty || 'unknown confidence'})` : 'No email found.'}`
        : `Search status: **${item?.status || 'unknown'}**. ${['NONE', 'SCHEDULED', 'IN_PROGRESS'].includes(item?.status) ? 'Still processing, try again shortly.' : ''}`
    };
  })
  .build();

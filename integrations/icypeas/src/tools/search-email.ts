import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchEmail = SlateTool.create(spec, {
  name: 'Search Email',
  key: 'search_email',
  description: `Find a professional email address for a person given their name and company domain or name. Submits an asynchronous search request and returns the search ID. Use **Get Search Result** to retrieve the found email once processing completes.`,
  instructions: [
    'At least one of firstname or lastname must be provided along with domainOrCompany.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      firstname: z.string().optional().describe('First name of the person to find'),
      lastname: z.string().optional().describe('Last name of the person to find'),
      domainOrCompany: z.string().describe('Domain name or company name of the person')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the search was accepted'),
      searchId: z.string().optional().describe('ID to retrieve the result later')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.emailSearch({
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      domainOrCompany: ctx.input.domainOrCompany
    });

    return {
      output: {
        success: result.success ?? true,
        searchId: result._id || result.id
      },
      message:
        result.success !== false
          ? `Email search submitted for **${[ctx.input.firstname, ctx.input.lastname].filter(Boolean).join(' ')}** at **${ctx.input.domainOrCompany}**. Search ID: \`${result._id || result.id}\``
          : `Email search failed: ${JSON.stringify(result)}`
    };
  })
  .build();

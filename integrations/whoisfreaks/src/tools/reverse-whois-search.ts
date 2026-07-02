import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let reverseWhoisSearch = SlateTool.create(spec, {
  name: 'Reverse WHOIS Search',
  key: 'reverse_whois_search',
  description: `Search WHOIS records by owner name, email address, domain keyword, or company name. Useful for finding all domains associated with a specific registrant, organization, or contact email. Supports pagination and a mini mode that returns lighter results.`,
  instructions: [
    'Provide at least one search parameter: keyword, email, owner, or company.',
    'Use mini mode for faster, lighter results when full WHOIS detail is not needed.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Domain keyword to search for'),
      email: z.string().optional().describe('Registrant email address to search for'),
      owner: z.string().optional().describe('Owner/registrant name to search for'),
      company: z.string().optional().describe('Company/organization name to search for'),
      mode: z
        .enum(['mini', 'default'])
        .optional()
        .describe('Response mode: "mini" for lightweight results, "default" for full details'),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      reverseResults: z.any().describe('Reverse WHOIS search results with matching domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });

    if (!ctx.input.keyword && !ctx.input.email && !ctx.input.owner && !ctx.input.company) {
      throw new Error(
        'At least one search parameter (keyword, email, owner, or company) must be provided.'
      );
    }

    let result = await client.reverseWhoisLookup({
      keyword: ctx.input.keyword,
      email: ctx.input.email,
      owner: ctx.input.owner,
      company: ctx.input.company,
      mode: ctx.input.mode,
      page: ctx.input.page
    });

    let searchBy =
      ctx.input.keyword || ctx.input.email || ctx.input.owner || ctx.input.company;
    return {
      output: { reverseResults: result },
      message: `Found reverse WHOIS results for **${searchBy}**.`
    };
  })
  .build();

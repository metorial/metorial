import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search 130K+ government buyer contacts and contractor personnel records. Look up contacts by email address. Supports relationship-building and outreach efforts for government contracting business development.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactEmail: z
        .string()
        .optional()
        .describe('Email address to look up a specific contact'),
      ordering: z
        .enum(['last_seen', '-last_seen'])
        .optional()
        .describe('Sort order for results'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      contacts: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of people/contact records'),
      totalCount: z.number().describe('Total number of matching contacts'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.getPeople({
      contactEmail: ctx.input.contactEmail,
      ordering: ctx.input.ordering,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        contacts: response.results,
        totalCount: response.meta.pagination.count,
        currentPage: response.meta.pagination.page,
        totalPages: response.meta.pagination.pages
      },
      message: `Found **${response.meta.pagination.count}** contacts (page ${response.meta.pagination.page} of ${response.meta.pagination.pages}). Returned **${response.results.length}** results.`
    };
  })
  .build();

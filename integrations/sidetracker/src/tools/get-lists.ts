import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLists = SlateTool.create(spec, {
  name: 'Get Lists',
  key: 'get_lists',
  description: `Retrieve conversion lists from your Sidetracker account. Lists organize all conversions, showing the number of conversions per list at a glance. Use pagination to navigate through large sets of lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of lists per page')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of lists'),
      nextPage: z.string().nullable().describe('URL for the next page of results'),
      previousPage: z.string().nullable().describe('URL for the previous page of results'),
      lists: z
        .array(
          z.object({
            listId: z.string().describe('Unique identifier of the list'),
            name: z.string().describe('Name of the list'),
            description: z.string().describe('Description of the list'),
            preset: z.string().describe('Preset type of the list (tracking or checks)')
          })
        )
        .describe('Array of lists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getLists(ctx.input.page, ctx.input.pageSize);
    if (
      !isApiErrorRecord(result) ||
      typeof result.count !== 'number' ||
      !Number.isFinite(result.count) ||
      (result.next !== null && typeof result.next !== 'string') ||
      (result.previous !== null && typeof result.previous !== 'string') ||
      !Array.isArray(result.results)
    ) {
      throw createApiServiceError(
        'Sidetracker returned an invalid list response: count must be a number, next and previous must be strings or null, and results must be an array.',
        { reason: 'sidetracker_invalid_list_response' }
      );
    }

    return {
      output: {
        count: result.count,
        nextPage: result.next,
        previousPage: result.previous,
        lists: result.results.map(list => {
          let unique_id = list?.unique_id;
          let name = list?.name;
          let description = list?.description;
          let preset = list?.preset;
          if (
            typeof unique_id !== 'string' ||
            typeof name !== 'string' ||
            typeof description !== 'string' ||
            typeof preset !== 'string'
          ) {
            throw createApiServiceError(
              'Sidetracker returned a list without the string unique_id, name, description, and preset fields required for this result.',
              { reason: 'sidetracker_invalid_list_response' }
            );
          }
          return { listId: unique_id, name, description, preset };
        })
      },
      message: `Retrieved **${result.results.length}** lists (${result.count} total).`
    };
  })
  .build();

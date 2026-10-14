import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let getPersonActivity = SlateTool.create(spec, {
  name: 'Get Person Activity',
  key: 'get_person_activity',
  description:
    "Retrieve a person's tracked events and session activity from GoSquared People CRM. Search by event name, select event types, restrict the date range, and page through the activity history.",
  constraints: ['Maximum 250 results per request.'],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      personId: z.string().describe('The unique person ID'),
      query: z.string().optional().describe('Search term for event names'),
      type: z
        .string()
        .optional()
        .describe('Comma-delimited event types: event, sessionEvent, or both'),
      from: z.string().optional().describe('Start date-time for the activity query'),
      to: z.string().optional().describe('End date-time for the activity query'),
      sort: z.string().optional().describe('Sort field and direction, such as ts:desc'),
      limit: z
        .string()
        .optional()
        .describe('Count or offset,count, such as 10 or 10,20; maximum count is 250')
    })
  )
  .output(
    z.object({
      activity: z.any().describe('Person activity and pagination data returned by GoSquared')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });
    let { personId, ...params } = ctx.input;
    let activity = await client.getPersonFeed(personId, params);
    return {
      output: { activity },
      message: `Retrieved activity for person **${personId}**.`
    };
  })
  .build();

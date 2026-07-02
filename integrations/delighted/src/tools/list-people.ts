import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `List survey recipients. Can filter by date range, email, or phone number. Also supports listing unsubscribed people and bounced emails by setting the \`listType\` parameter.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      listType: z
        .enum(['all', 'unsubscribed', 'bounced'])
        .optional()
        .describe('Type of people list to retrieve. Defaults to all.'),
      perPage: z.number().optional().describe('Results per page (max 100, default 20)'),
      page: z.number().optional().describe('Page number (for unsubscribed/bounced lists)'),
      since: z
        .number()
        .optional()
        .describe('Unix timestamp to filter records on or after this time'),
      until: z
        .number()
        .optional()
        .describe('Unix timestamp to filter records on or before this time'),
      email: z.string().optional().describe('Search for a specific person by email'),
      phoneNumber: z.string().optional().describe('Search by phone number in E.164 format')
    })
  )
  .output(
    z.object({
      people: z.array(z.any()).describe('List of people records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let listType = ctx.input.listType || 'all';

    let people: any[];

    if (listType === 'unsubscribed') {
      people = await client.listUnsubscribes({
        perPage: ctx.input.perPage,
        page: ctx.input.page,
        since: ctx.input.since,
        until: ctx.input.until
      });
    } else if (listType === 'bounced') {
      people = await client.listBounces({
        perPage: ctx.input.perPage,
        page: ctx.input.page,
        since: ctx.input.since,
        until: ctx.input.until
      });
    } else {
      people = await client.listPeople({
        perPage: ctx.input.perPage,
        since: ctx.input.since,
        until: ctx.input.until,
        email: ctx.input.email,
        phoneNumber: ctx.input.phoneNumber
      });
    }

    return {
      output: { people },
      message: `Retrieved **${people.length}** ${listType === 'unsubscribed' ? 'unsubscribed' : listType === 'bounced' ? 'bounced' : ''} people.`
    };
  })
  .build();

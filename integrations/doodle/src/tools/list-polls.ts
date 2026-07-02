import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pollSummarySchema = z.object({
  pollId: z.string().describe('Unique poll identifier'),
  title: z.string().describe('Title of the poll'),
  state: z.string().describe('Current poll state'),
  type: z.string().describe('Poll type (TEXT or DATE)'),
  latestChange: z.string().optional().describe('Timestamp of the last change'),
  participantsCount: z.number().optional().describe('Number of participants')
});

export let listPollsTool = SlateTool.create(spec, {
  name: 'List Polls',
  key: 'list_polls',
  description: `List Doodle polls from the authenticated user's dashboard. Can retrieve polls you **created** or polls you **participated in**.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['created', 'participated'])
        .describe('Whether to list polls you created or polls you participated in'),
      locale: z.string().optional().describe('Locale for the response, e.g. "en", "de", "fr"')
    })
  )
  .output(
    z.object({
      polls: z.array(pollSummarySchema).describe('List of polls matching the scope'),
      totalCount: z.number().describe('Total number of polls returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let polls =
      ctx.input.scope === 'created'
        ? await client.getMyPolls({ locale: ctx.input.locale })
        : await client.getParticipatedPolls({ locale: ctx.input.locale });

    return {
      output: {
        polls,
        totalCount: polls.length
      },
      message: `Found **${polls.length}** ${ctx.input.scope === 'created' ? 'created' : 'participated'} poll(s).`
    };
  })
  .build();

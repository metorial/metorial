import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let respondentSchema = z.object({
  email: z.string().optional().describe('Respondent email'),
  name: z.string().optional().describe('Respondent name'),
  respondedAt: z.string().optional().describe('When the respondent voted')
});

let pollOptionSchema = z.object({
  text: z.string().optional().describe('Option text'),
  respondents: z.array(respondentSchema).optional().describe('People who chose this option')
});

let pollSchema = z.object({
  pollId: z.string().describe('Poll ID'),
  question: z.string().optional().describe('Poll question'),
  livePoll: z.boolean().optional().describe('Whether the poll is live (accepting responses)'),
  options: z.array(pollOptionSchema).optional().describe('Poll options with vote data'),
  createdAt: z.string().optional().describe('When the poll was created')
});

export let listPolls = SlateTool.create(spec, {
  name: 'List Polls',
  key: 'list_polls',
  description: `List polls you've created in Mixmax emails. Returns poll questions, options, and respondent data including who voted and when.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of results'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      polls: z.array(pollSchema).describe('List of polls'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasNext: z.boolean().optional().describe('Whether more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listPolls({
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    let results = data.results || data || [];
    let polls = results.map((p: any) => ({
      pollId: p._id || p.id,
      question: p.question,
      livePoll: p.livePoll,
      options: p.options,
      createdAt: p.createdAt
    }));

    return {
      output: {
        polls,
        nextCursor: data.next,
        hasNext: data.hasNext
      },
      message: `Found ${polls.length} poll(s).`
    };
  })
  .build();

export let getPoll = SlateTool.create(spec, {
  name: 'Get Poll',
  key: 'get_poll',
  description: `Retrieve a specific poll by ID with full details including question, options, and individual respondent votes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pollId: z.string().describe('ID of the poll to retrieve')
    })
  )
  .output(pollSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let p = await client.getPoll(ctx.input.pollId);

    return {
      output: {
        pollId: p._id || p.id,
        question: p.question,
        livePoll: p.livePoll,
        options: p.options,
        createdAt: p.createdAt
      },
      message: `Retrieved poll: "${p.question}".`
    };
  })
  .build();

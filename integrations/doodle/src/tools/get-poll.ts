import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let participantSchema = z.object({
  participantId: z.string().describe('Unique participant identifier'),
  name: z.string().describe('Participant name'),
  preferences: z
    .array(z.number())
    .describe('Voting preferences for each option (0=no, 1=yes, 2=if need be)'),
  email: z.string().optional().describe('Participant email if provided')
});

let optionSchema = z.object({
  text: z.string().optional().describe('Option text for text-based polls'),
  date: z.string().optional().describe('Date for date-based polls'),
  startTime: z.string().optional().describe('Start time for date-based polls'),
  endTime: z.string().optional().describe('End time for date-based polls')
});

export let getPollTool = SlateTool.create(spec, {
  name: 'Get Poll',
  key: 'get_poll',
  description: `Retrieve complete details of a Doodle poll including its options, participants, and their votes. Use this to check the current status and results of a scheduling poll.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pollId: z.string().describe('The unique identifier of the poll to retrieve')
    })
  )
  .output(
    z.object({
      pollId: z.string().describe('Unique poll identifier'),
      title: z.string().describe('Title of the poll'),
      description: z.string().optional().describe('Poll description'),
      location: z.string().optional().describe('Event location'),
      type: z.string().describe('Poll type (TEXT or DATE)'),
      state: z.string().describe('Current poll state'),
      hidden: z
        .boolean()
        .optional()
        .describe('Whether votes are hidden from other participants'),
      ifNeedBe: z.boolean().optional().describe('Whether IF_NEED_BE option is enabled'),
      options: z.array(optionSchema).describe('Available options in the poll'),
      participants: z
        .array(participantSchema)
        .optional()
        .describe('List of participants and their votes'),
      participantCount: z.number().describe('Number of participants who have voted'),
      createdAt: z.string().optional().describe('When the poll was created'),
      updatedAt: z.string().optional().describe('When the poll was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let poll = await client.getPoll(ctx.input.pollId);

    return {
      output: {
        pollId: poll.pollId,
        title: poll.title,
        description: poll.description,
        location: poll.location,
        type: poll.type,
        state: poll.state,
        hidden: poll.hidden,
        ifNeedBe: poll.ifNeedBe,
        options: poll.options || [],
        participants: poll.participants,
        participantCount: poll.participants?.length || 0,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt
      },
      message: `Retrieved poll "${poll.title}" (\`${poll.pollId}\`) — **${poll.participants?.length || 0}** participant(s), state: **${poll.state}**.`
    };
  })
  .build();

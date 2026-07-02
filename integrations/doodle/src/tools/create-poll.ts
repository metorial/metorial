import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let textOptionSchema = z.object({
  text: z.string().describe('The text label for this option')
});

let dateOptionSchema = z.object({
  date: z.string().describe('Date in YYYYMMDD format, e.g. "20250315"'),
  startTime: z.string().optional().describe('Start time in HHmm format, e.g. "0900"'),
  endTime: z.string().optional().describe('End time in HHmm format, e.g. "1000"')
});

export let createPollTool = SlateTool.create(spec, {
  name: 'Create Poll',
  key: 'create_poll',
  description: `Create a new Doodle scheduling poll. Supports both **text-based polls** (choosing between text options like restaurant names) and **date-based polls** (choosing between meeting times).
Configure voting mode, visibility, and participant requirements.`,
  instructions: [
    'For text polls, provide options with "text" field. For date polls, provide options with "date" field and optionally "startTime"/"endTime".',
    'Date format is YYYYMMDD (e.g. "20250315"). Time format is HHmm (e.g. "0900").',
    'Set ifNeedBe to true to enable YES/NO/MAYBE voting mode instead of YES/NO.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the poll'),
      description: z
        .string()
        .optional()
        .describe('Description providing context for the poll'),
      location: z.string().optional().describe('Location for the meeting or event'),
      pollType: z
        .enum(['TEXT', 'DATE'])
        .describe('Type of poll: TEXT for general options, DATE for scheduling'),
      textOptions: z
        .array(textOptionSchema)
        .optional()
        .describe('Options for a text-based poll'),
      dateOptions: z
        .array(dateOptionSchema)
        .optional()
        .describe('Options for a date-based poll'),
      initiatorName: z.string().describe('Name of the poll creator'),
      initiatorEmail: z.string().optional().describe('Email of the poll creator'),
      ifNeedBe: z
        .boolean()
        .optional()
        .describe('Enable YES/NO/MAYBE voting mode (default: YES/NO only)'),
      hidden: z
        .boolean()
        .optional()
        .describe('Hide participant votes from other participants'),
      byInvitation: z.boolean().optional().describe('Only invited participants can vote'),
      askEmail: z.boolean().optional().describe('Require participants to provide their email'),
      askPhone: z
        .boolean()
        .optional()
        .describe('Require participants to provide their phone number'),
      askAddress: z
        .boolean()
        .optional()
        .describe('Require participants to provide their address'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone for date-based polls, e.g. "America/New_York"')
    })
  )
  .output(
    z.object({
      pollId: z.string().describe('Unique identifier for the created poll'),
      adminKey: z
        .string()
        .optional()
        .describe('Admin key for managing the poll (store securely)'),
      title: z.string().describe('Title of the created poll'),
      type: z.string().describe('Type of poll (TEXT or DATE)'),
      state: z.string().describe('Current state of the poll')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let options =
      ctx.input.pollType === 'TEXT'
        ? (ctx.input.textOptions || []).map(o => ({ text: o.text }))
        : (ctx.input.dateOptions || []).map(o => ({
            date: o.date,
            startTime: o.startTime,
            endTime: o.endTime
          }));

    let poll = await client.createPoll({
      title: ctx.input.title,
      description: ctx.input.description,
      location: ctx.input.location,
      type: ctx.input.pollType,
      options,
      initiator: {
        name: ctx.input.initiatorName,
        email: ctx.input.initiatorEmail
      },
      ifNeedBe: ctx.input.ifNeedBe,
      hidden: ctx.input.hidden,
      byInvitation: ctx.input.byInvitation,
      askEmail: ctx.input.askEmail,
      askPhone: ctx.input.askPhone,
      askAddress: ctx.input.askAddress,
      timezone: ctx.input.timezone
    });

    return {
      output: {
        pollId: poll.pollId,
        adminKey: poll.adminKey,
        title: poll.title,
        type: poll.type,
        state: poll.state
      },
      message: `Created **${poll.type}** poll "${poll.title}" with ID \`${poll.pollId}\`.`
    };
  })
  .build();

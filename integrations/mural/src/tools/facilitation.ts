import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTimerTool = SlateTool.create(spec, {
  name: 'Manage Timer',
  key: 'manage_timer',
  description: `Start, pause, resume, or check the status of a countdown timer on a mural. Timers are useful for facilitated sessions with time-boxed activities.`,
  instructions: [
    'Use action "start" with durationInSeconds to begin a new timer.',
    'Use action "pause" or "resume" to control a running timer.',
    'Use action "get" to check the current timer status.',
    'Use action "add_time" with extraTimeInSeconds to extend a running timer.'
  ]
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural'),
      action: z
        .enum(['start', 'pause', 'resume', 'get', 'add_time'])
        .describe('Timer action to perform'),
      durationInSeconds: z
        .number()
        .optional()
        .describe('Timer duration in seconds (required for "start")'),
      extraTimeInSeconds: z
        .number()
        .optional()
        .describe('Additional seconds to add (for "add_time")')
    })
  )
  .output(
    z.object({
      status: z.string().optional(),
      remainingTimeInSeconds: z.number().optional(),
      totalDurationInSeconds: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { muralId, action, durationInSeconds, extraTimeInSeconds } = ctx.input;
    let timer: any;

    switch (action) {
      case 'start':
        if (!durationInSeconds)
          throw new Error('durationInSeconds is required for starting a timer');
        timer = await client.startTimer(muralId, { durationInSeconds });
        break;
      case 'pause':
        timer = await client.updateTimer(muralId, { status: 'paused' });
        break;
      case 'resume':
        timer = await client.updateTimer(muralId, { status: 'running' });
        break;
      case 'get':
        timer = await client.getTimer(muralId);
        break;
      case 'add_time':
        if (!extraTimeInSeconds)
          throw new Error('extraTimeInSeconds is required for adding time');
        timer = await client.updateTimer(muralId, { extraTimeInSeconds });
        break;
    }

    return {
      output: {
        status: timer?.status,
        remainingTimeInSeconds: timer?.remainingTimeInSeconds,
        totalDurationInSeconds: timer?.totalDurationInSeconds
      },
      message: `Timer ${action}: status is **${timer?.status || 'unknown'}**.`
    };
  })
  .build();

export let managePrivateModeTool = SlateTool.create(spec, {
  name: 'Manage Private Mode',
  key: 'manage_private_mode',
  description: `Start, end, or check the status of private mode on a mural. In private mode, participants work independently and their content is hidden from others until the session ends.`
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural'),
      action: z.enum(['start', 'end', 'get']).describe('Private mode action to perform')
    })
  )
  .output(
    z.object({
      active: z.boolean().optional(),
      startedOn: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { muralId, action } = ctx.input;
    let result: any;

    switch (action) {
      case 'start':
        result = await client.startPrivateMode(muralId);
        break;
      case 'end':
        result = await client.endPrivateMode(muralId);
        break;
      case 'get':
        result = await client.getPrivateMode(muralId);
        break;
    }

    return {
      output: {
        active: result?.active ?? result?.status === 'active',
        startedOn: result?.startedOn
      },
      message: `Private mode ${action}: **${result?.active || result?.status === 'active' ? 'active' : 'inactive'}**.`
    };
  })
  .build();

export let getChatHistoryTool = SlateTool.create(spec, {
  name: 'Get Chat History',
  key: 'get_chat_history',
  description: `Retrieve the chat message history for a mural.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      muralId: z.string().describe('ID of the mural to get chat history from')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          text: z.string().optional(),
          authorId: z.string().optional(),
          authorName: z.string().optional(),
          createdOn: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let messages = await client.getChat(ctx.input.muralId);

    let mapped = (messages || []).map((m: any) => ({
      text: m.text || m.message,
      authorId: m.authorId || m.author?.id,
      authorName:
        m.authorName ||
        m.author?.name ||
        (m.author
          ? `${m.author.firstName || ''} ${m.author.lastName || ''}`.trim()
          : undefined),
      createdOn: m.createdOn || m.timestamp
    }));

    return {
      output: { messages: mapped },
      message: `Retrieved **${mapped.length}** chat message(s).`
    };
  })
  .build();

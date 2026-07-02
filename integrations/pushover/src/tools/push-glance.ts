import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let pushGlance = SlateTool.create(spec, {
  name: 'Push Glance Data',
  key: 'push_glance',
  description: `Push small data updates to smartwatch complications and device widgets (Glances). This silently updates on-screen widgets without generating notifications. At least one data field (title, text, subtext, count, or percent) must be provided. Currently only Apple Watch is supported.`,
  instructions: [
    'Provide at least one of **title**, **text**, **subtext**, **count**, or **percent**.',
    'Data persists across calls — only fields you send will be overwritten.'
  ],
  constraints: [
    'Recommended minimum 20 minutes between updates.',
    'watchOS limits 50 updates per device per day.',
    'title, text, and subtext are each limited to 100 characters.',
    'percent must be an integer from 0 to 100.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientKey: z
        .string()
        .optional()
        .describe('User key to push glance data to. Defaults to the authenticated user key.'),
      device: z
        .string()
        .optional()
        .describe('Target a specific device. Omit to update all user widgets.'),
      title: z.string().optional().describe('Data description (max 100 characters)'),
      text: z.string().optional().describe('Primary data line (max 100 characters)'),
      subtext: z.string().optional().describe('Secondary data line (max 100 characters)'),
      count: z
        .number()
        .optional()
        .describe('Integer count to display (negative values allowed)'),
      percent: z
        .number()
        .min(0)
        .max(100)
        .optional()
        .describe('Percentage value (0–100) for progress bar/circle')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result = await client.pushGlance({
      user: ctx.input.recipientKey,
      device: ctx.input.device,
      title: ctx.input.title,
      text: ctx.input.text,
      subtext: ctx.input.subtext,
      count: ctx.input.count,
      percent: ctx.input.percent
    });

    let fields: string[] = [];
    if (ctx.input.title !== undefined) fields.push('title');
    if (ctx.input.text !== undefined) fields.push('text');
    if (ctx.input.subtext !== undefined) fields.push('subtext');
    if (ctx.input.count !== undefined) fields.push('count');
    if (ctx.input.percent !== undefined) fields.push('percent');

    return {
      output: {
        requestId: result.request
      },
      message: `Pushed glance data (${fields.join(', ')}) to widget.`
    };
  })
  .build();

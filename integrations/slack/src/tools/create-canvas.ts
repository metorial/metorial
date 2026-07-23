import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let createCanvas = SlateTool.create(spec, {
  name: 'Create Canvas',
  key: 'create_canvas',
  description:
    'Create a persistent Slack Canvas for meeting notes, plans, reports, or other structured documents. Canvas Markdown is distinct from Slack message mrkdwn.',
  instructions: [
    'Use a Canvas for durable structured content, not for a short conversational message.',
    'Provide Canvas-flavored Markdown in content. Headings are supported through H3.',
    'Do not repeat the title as the first heading in content.',
    'Provide channelId when creating a Canvas on a Slack plan that requires a channel association.'
  ],
  constraints: [
    'Standalone Canvas availability and channel requirements depend on the workspace plan.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.canvasesWrite)
  .input(
    z.object({
      title: z.string().trim().min(1).optional().describe('Concise Canvas title'),
      content: z
        .string()
        .optional()
        .describe('Canvas-flavored Markdown content; do not repeat the title'),
      channelId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Channel ID to associate with the Canvas when required by the Slack plan')
    })
  )
  .output(
    z.object({
      canvasId: z.string().describe('ID of the created Slack Canvas'),
      title: z.string().optional().describe('Canvas title when provided'),
      channelId: z.string().optional().describe('Associated channel ID when provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let canvas = await client.createCanvas({
      title: ctx.input.title,
      content: ctx.input.content,
      channelId: ctx.input.channelId
    });

    return {
      output: {
        canvasId: canvas.id,
        title: canvas.title ?? ctx.input.title,
        channelId: ctx.input.channelId
      },
      message: `Created Slack Canvas${ctx.input.title ? ` **${ctx.input.title}**` : ''} (\`${canvas.id}\`).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { type ActionButton, Client } from '../lib/client';
import { spec } from '../spec';

let actionButtonSchema = z.object({
  action: z.enum(['view', 'http', 'broadcast', 'copy']).describe('Type of action button'),
  label: z.string().describe('Button label text'),
  url: z.string().optional().describe('URL for view/http actions'),
  method: z.string().optional().describe('HTTP method for http actions (defaults to POST)'),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe('HTTP headers for http actions'),
  body: z.string().optional().describe('HTTP body for http actions'),
  intent: z.string().optional().describe('Android broadcast intent for broadcast actions'),
  extras: z
    .record(z.string(), z.string())
    .optional()
    .describe('Android intent extras for broadcast actions'),
  value: z.string().optional().describe('Text to copy for copy actions'),
  clear: z
    .boolean()
    .optional()
    .describe('Whether to dismiss the notification after the action')
});

export let publishMessage = SlateTool.create(spec, {
  name: 'Publish Message',
  key: 'publish_message',
  description: `Send a notification to an ntfy topic. Supports rich formatting including **titles**, **priorities**, **tags/emojis**, **Markdown**, **click actions**, **icons**, **attachments**, **action buttons**, **scheduled delivery**, **email forwarding**, and **phone calls**. Topics are created automatically on first use.`,
  instructions: [
    'Priority levels: 1 (min) = silent, 2 (low) = no sound, 3 (default) = standard, 4 (high) = prominent, 5 (max/urgent) = very prominent with pop-over.',
    'Tags can include emoji shortcodes (e.g., "warning", "white_check_mark") which are auto-converted to emojis on supported clients.',
    'Delay supports durations (e.g., "30m", "2h"), Unix timestamps, or natural language (e.g., "tomorrow, 10am"). Minimum 10 seconds, maximum 3 days.',
    'Up to 3 action buttons can be added per notification.'
  ],
  constraints: [
    'Maximum 3 action buttons per notification.',
    'Scheduled delivery delay must be between 10 seconds and 3 days.',
    'Phone calls require a verified phone number and ntfy Pro.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      topic: z
        .string()
        .describe('Topic name to publish to (e.g., "alerts", "my-notifications")'),
      message: z.string().optional().describe('Notification message body'),
      title: z.string().optional().describe('Notification title'),
      priority: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('Priority level: 1 (min), 2 (low), 3 (default), 4 (high), 5 (max/urgent)'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags and emoji shortcodes (e.g., ["warning", "server-alert"])'),
      markdown: z
        .boolean()
        .optional()
        .describe('Enable Markdown formatting in the message body'),
      clickUrl: z
        .string()
        .optional()
        .describe(
          'URL to open when notification is tapped (http://, mailto:, geo:, or custom URI)'
        ),
      iconUrl: z.string().optional().describe('URL of a custom notification icon (JPEG/PNG)'),
      attachUrl: z
        .string()
        .optional()
        .describe('URL of an external file to attach to the notification'),
      filename: z.string().optional().describe('Override filename for the attachment'),
      delay: z
        .string()
        .optional()
        .describe(
          'Schedule delivery for later (e.g., "30m", "2h", "tomorrow, 10am", or Unix timestamp)'
        ),
      email: z.string().optional().describe('Email address to forward the notification to'),
      call: z
        .string()
        .optional()
        .describe(
          'Phone number to call with text-to-speech, or "yes" for the default verified number'
        ),
      actions: z
        .array(actionButtonSchema)
        .max(3)
        .optional()
        .describe('Up to 3 interactive action buttons'),
      cacheDisabled: z.boolean().optional().describe('Disable server-side message caching'),
      firebaseDisabled: z.boolean().optional().describe('Disable Firebase/FCM forwarding')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique ID of the published message'),
      time: z.number().describe('Unix timestamp when the message was published'),
      topic: z.string().describe('Topic the message was published to'),
      title: z.string().optional().describe('Notification title'),
      message: z.string().optional().describe('Notification message body'),
      priority: z.number().optional().describe('Priority level'),
      tags: z.array(z.string()).optional().describe('Tags assigned to the message'),
      expires: z.number().optional().describe('Unix timestamp when the message expires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.config.serverUrl,
      auth: ctx.auth
    });

    ctx.info(`Publishing message to topic "${ctx.input.topic}"`);

    let result = await client.publish({
      topic: ctx.input.topic,
      message: ctx.input.message,
      title: ctx.input.title,
      priority: ctx.input.priority,
      tags: ctx.input.tags,
      markdown: ctx.input.markdown,
      clickUrl: ctx.input.clickUrl,
      iconUrl: ctx.input.iconUrl,
      attachUrl: ctx.input.attachUrl,
      filename: ctx.input.filename,
      delay: ctx.input.delay,
      email: ctx.input.email,
      call: ctx.input.call,
      actions: ctx.input.actions as ActionButton[] | undefined,
      cacheDisabled: ctx.input.cacheDisabled,
      firebaseDisabled: ctx.input.firebaseDisabled
    });

    let summary = `Published message to topic **${result.topic}**`;
    if (result.title) summary += ` with title "${result.title}"`;
    if (ctx.input.delay) summary += ` (scheduled for ${ctx.input.delay})`;
    summary += `. Message ID: \`${result.messageId}\``;

    return {
      output: {
        messageId: result.messageId,
        time: result.time,
        topic: result.topic,
        title: result.title,
        message: result.message,
        priority: result.priority,
        tags: result.tags,
        expires: result.expires
      },
      message: summary
    };
  })
  .build();

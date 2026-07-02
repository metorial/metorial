import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve saved image templates and/or message templates. Image templates are used for the front/exterior of mail pieces. Message templates store handwritten message content, handwriting style, font settings, QR code URLs, and gift card configuration.
Templates are managed through the Thanks.io dashboard and referenced by ID when sending mail.`,
  instructions: [
    'Set templateType to "image", "message", or "both" to choose which templates to retrieve.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateType: z
        .enum(['image', 'message', 'both'])
        .default('both')
        .describe('Type of templates to retrieve')
    })
  )
  .output(
    z.object({
      imageTemplates: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of image templates'),
      messageTemplates: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of message templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let { templateType } = ctx.input;

    let imageTemplates: Record<string, unknown>[] | undefined;
    let messageTemplates: Record<string, unknown>[] | undefined;

    if (templateType === 'image' || templateType === 'both') {
      let result = await client.listImageTemplates();
      imageTemplates = (Array.isArray(result) ? result : result.data || []) as Record<
        string,
        unknown
      >[];
    }

    if (templateType === 'message' || templateType === 'both') {
      let result = await client.listMessageTemplates();
      messageTemplates = (Array.isArray(result) ? result : result.data || []) as Record<
        string,
        unknown
      >[];
    }

    let parts: string[] = [];
    if (imageTemplates) parts.push(`**${imageTemplates.length}** image template(s)`);
    if (messageTemplates) parts.push(`**${messageTemplates.length}** message template(s)`);

    return {
      output: {
        imageTemplates,
        messageTemplates
      },
      message: `Retrieved ${parts.join(' and ')}.`
    };
  })
  .build();

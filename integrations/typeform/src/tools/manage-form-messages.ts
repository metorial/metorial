import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { spec } from '../spec';

export let manageFormMessages = SlateTool.create(spec, {
  name: 'Manage Form Messages',
  key: 'manage_form_messages',
  description: `Retrieve or update a form's customizable interface messages, such as submit button text, validation copy, progress labels, and file upload prompts.`,
  instructions: [
    'Provide only **formId** to retrieve current messages.',
    'Provide **messages** to merge and update selected keys while preserving the rest.',
    'Set **replaceAll** to true only when passing a complete Typeform messages object.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form whose messages should be managed'),
      messages: z
        .record(z.string(), z.string())
        .optional()
        .describe('Message keys and replacement values, e.g. {"label.button.submit":"Send"}'),
      replaceAll: z
        .boolean()
        .optional()
        .describe('Replace the full messages object instead of merging with existing messages')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Form ID'),
      messages: z.record(z.string(), z.string()).describe('Current form messages'),
      updated: z.boolean().describe('Whether messages were updated'),
      changedKeys: z.array(z.string()).describe('Message keys sent in the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (!ctx.input.messages) {
      let messages = await client.getFormMessages(ctx.input.formId);
      return {
        output: {
          formId: ctx.input.formId,
          messages,
          updated: false,
          changedKeys: []
        },
        message: `Retrieved custom messages for form \`${ctx.input.formId}\`.`
      };
    }

    let changedKeys = Object.keys(ctx.input.messages);
    let nextMessages = ctx.input.replaceAll
      ? ctx.input.messages
      : {
          ...(await client.getFormMessages(ctx.input.formId)),
          ...ctx.input.messages
        };

    await client.updateFormMessages(ctx.input.formId, nextMessages);
    let messages = await client.getFormMessages(ctx.input.formId);

    return {
      output: {
        formId: ctx.input.formId,
        messages,
        updated: true,
        changedKeys
      },
      message: `Updated **${changedKeys.length}** custom message(s) for form \`${ctx.input.formId}\`.`
    };
  })
  .build();

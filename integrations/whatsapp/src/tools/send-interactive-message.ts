import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendInteractiveMessage = SlateTool.create(spec, {
  name: 'Send Interactive Message',
  key: 'send_interactive_message',
  description: `Send an interactive WhatsApp message with **reply buttons** or a **list menu**.
Reply buttons allow up to 3 quick-reply options. List menus allow structured multi-section selection menus with up to 10 sections.
Use these for structured user responses like surveys, menu selections, or quick actions.`,
  instructions: [
    'Reply buttons: max 3 buttons, each title max 20 characters',
    'List menus: max 10 sections, row title max 24 chars, row description max 72 chars',
    'Header text max 60 characters, body max 1024 characters, footer max 60 characters'
  ],
  constraints: ['Can only be sent within the 24-hour customer service window'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      to: z.string().describe('Recipient phone number with country code'),
      interactiveType: z.enum(['buttons', 'list']).describe('Type of interactive message'),
      headerText: z.string().optional().describe('Optional header text (max 60 characters)'),
      body: z.string().describe('Message body text (max 1024 characters)'),
      footerText: z.string().optional().describe('Optional footer text (max 60 characters)'),
      buttons: z
        .array(
          z.object({
            buttonId: z.string().describe('Unique button identifier (max 256 chars)'),
            title: z.string().describe('Button display text (max 20 chars)')
          })
        )
        .max(3)
        .optional()
        .describe('Required for "buttons" type. Max 3 buttons'),
      listButtonText: z
        .string()
        .optional()
        .describe('Text for the list menu button (required for "list" type)'),
      sections: z
        .array(
          z.object({
            title: z.string().describe('Section title'),
            rows: z.array(
              z.object({
                rowId: z.string().describe('Unique row identifier'),
                title: z.string().describe('Row title (max 24 chars)'),
                description: z.string().optional().describe('Row description (max 72 chars)')
              })
            )
          })
        )
        .optional()
        .describe('Required for "list" type. Max 10 sections')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the sent message'),
      recipientPhone: z.string().optional().describe('Recipient phone number'),
      recipientWaId: z.string().optional().describe('Recipient WhatsApp ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result: any;
    let header = ctx.input.headerText
      ? { type: 'text', text: ctx.input.headerText }
      : undefined;

    if (ctx.input.interactiveType === 'buttons') {
      if (!ctx.input.buttons || ctx.input.buttons.length === 0) {
        throw new Error('buttons field is required for interactive buttons messages');
      }
      result = await client.sendInteractiveButtonsMessage(ctx.input.to, {
        header,
        body: ctx.input.body,
        footer: ctx.input.footerText,
        buttons: ctx.input.buttons.map(b => ({ id: b.buttonId, title: b.title }))
      });
    } else {
      if (!ctx.input.sections || ctx.input.sections.length === 0) {
        throw new Error('sections field is required for interactive list messages');
      }
      if (!ctx.input.listButtonText) {
        throw new Error('listButtonText is required for interactive list messages');
      }
      result = await client.sendInteractiveListMessage(ctx.input.to, {
        header,
        body: ctx.input.body,
        footer: ctx.input.footerText,
        buttonText: ctx.input.listButtonText,
        sections: ctx.input.sections.map(s => ({
          title: s.title,
          rows: s.rows.map(r => ({ id: r.rowId, title: r.title, description: r.description }))
        }))
      });
    }

    let messageId = result?.messages?.[0]?.id ?? '';
    let contact = result?.contacts?.[0];

    return {
      output: {
        messageId,
        recipientPhone: contact?.input,
        recipientWaId: contact?.wa_id
      },
      message: `Sent interactive **${ctx.input.interactiveType}** message to ${ctx.input.to}. Message ID: \`${messageId}\``
    };
  })
  .build();

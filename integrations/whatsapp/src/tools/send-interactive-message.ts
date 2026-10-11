import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// List rows are limited to 10 across all sections:
// https://developers.facebook.com/documentation/business-messaging/whatsapp/messages/interactive-list-messages
let MAX_LIST_ROWS = 10;

export let sendInteractiveMessage = SlateTool.create(spec, {
  name: 'Send Interactive Message',
  key: 'send_interactive_message',
  description: `Send an interactive WhatsApp message with **reply buttons**, a **list menu**, or a **call-to-action URL button**.
Reply buttons allow up to 3 quick-reply options. List menus show up to 10 rows grouped into up to 10 sections. A call-to-action URL button opens a link in the recipient's browser.
Use these for structured user responses like surveys, menu selections, or quick actions.`,
  instructions: [
    'Reply buttons: max 3 buttons, each title max 20 characters and unique; body max 1024 characters',
    'List menus: max 10 sections and 10 rows in total, section and row titles max 24 characters, row description max 72 characters, list button text max 20 characters; body max 4096 characters',
    'Call-to-action URL: ctaDisplayText (max 20 characters) and ctaUrl are required; body max 1024 characters',
    'Header text max 60 characters, footer max 60 characters',
    'Set replyToMessageId to quote an earlier message as a contextual reply'
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
      interactiveType: z
        .enum(['buttons', 'list', 'cta_url'])
        .describe(
          'Type of interactive message: "buttons" (reply buttons), "list" (list menu), or "cta_url" (call-to-action URL button)'
        ),
      headerText: z.string().optional().describe('Optional header text (max 60 characters)'),
      body: z
        .string()
        .describe('Message body text (max 1024 characters; max 4096 for list menus)'),
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
        .describe(
          'Text for the list menu button (required for "list" type, max 20 characters)'
        ),
      sections: z
        .array(
          z.object({
            title: z.string().describe('Section title (max 24 chars)'),
            rows: z.array(
              z.object({
                rowId: z.string().describe('Unique row identifier (max 200 chars)'),
                title: z.string().describe('Row title (max 24 chars)'),
                description: z.string().optional().describe('Row description (max 72 chars)')
              })
            )
          })
        )
        .optional()
        .describe('Required for "list" type. Max 10 sections and 10 rows in total'),
      ctaDisplayText: z
        .string()
        .optional()
        .describe(
          'Button label for "cta_url" type (required for "cta_url", max 20 characters)'
        ),
      ctaUrl: z
        .string()
        .optional()
        .describe('URL opened when the button is tapped (required for "cta_url" type)'),
      replyToMessageId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Optional WhatsApp message ID (wamid) to quote, sending this message as a contextual reply'
        )
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
    let { replyToMessageId } = ctx.input;
    let header = ctx.input.headerText
      ? { type: 'text', text: ctx.input.headerText }
      : undefined;

    if (ctx.input.interactiveType === 'buttons') {
      if (!ctx.input.buttons || ctx.input.buttons.length === 0) {
        throw createApiServiceError(
          'buttons field is required for interactive buttons messages'
        );
      }
      result = await client.sendInteractiveButtonsMessage(
        ctx.input.to,
        {
          header,
          body: ctx.input.body,
          footer: ctx.input.footerText,
          buttons: ctx.input.buttons.map(b => ({ id: b.buttonId, title: b.title }))
        },
        replyToMessageId
      );
    } else if (ctx.input.interactiveType === 'list') {
      if (!ctx.input.sections || ctx.input.sections.length === 0) {
        throw createApiServiceError(
          'sections field is required for interactive list messages'
        );
      }
      if (!ctx.input.listButtonText) {
        throw createApiServiceError(
          'listButtonText is required for interactive list messages'
        );
      }
      let rowCount = ctx.input.sections.reduce((count, s) => count + s.rows.length, 0);
      if (rowCount === 0 || rowCount > MAX_LIST_ROWS) {
        throw createApiServiceError(
          `Interactive list messages need between 1 and ${MAX_LIST_ROWS} rows across all sections; received ${rowCount}.`
        );
      }
      result = await client.sendInteractiveListMessage(
        ctx.input.to,
        {
          header,
          body: ctx.input.body,
          footer: ctx.input.footerText,
          buttonText: ctx.input.listButtonText,
          sections: ctx.input.sections.map(s => ({
            title: s.title,
            rows: s.rows.map(r => ({
              id: r.rowId,
              title: r.title,
              description: r.description
            }))
          }))
        },
        replyToMessageId
      );
    } else {
      if (!ctx.input.ctaDisplayText || !ctx.input.ctaUrl) {
        throw createApiServiceError(
          'ctaDisplayText and ctaUrl are required for call-to-action URL messages'
        );
      }
      result = await client.sendInteractiveCtaUrlMessage(
        ctx.input.to,
        {
          header,
          body: ctx.input.body,
          footer: ctx.input.footerText,
          displayText: ctx.input.ctaDisplayText,
          url: ctx.input.ctaUrl
        },
        replyToMessageId
      );
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

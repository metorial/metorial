import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let sendSheetEmail = SlateTool.create(spec, {
  name: 'Send Sheet via Email',
  key: 'send_sheet_email',
  description: `Send a sheet or specific rows via email to one or more recipients. Supports formatting options and optional CC to self.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet to send'),
      to: z.array(z.string()).describe('Recipient email addresses'),
      subject: z.string().describe('Email subject line'),
      message: z.string().optional().describe('Email message body'),
      ccMe: z.boolean().optional().describe('CC the sender'),
      format: z
        .enum(['PDF', 'EXCEL', 'CSV'])
        .optional()
        .describe('Format for the sheet attachment'),
      rowIds: z
        .array(z.string())
        .optional()
        .describe('Send only these specific rows instead of the full sheet'),
      columnIds: z
        .array(z.string())
        .optional()
        .describe('Include only these columns when sending rows')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the email was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.rowIds?.length) {
      await client.sendRowsViaEmail(ctx.input.sheetId, {
        to: ctx.input.to.map(email => ({ email })),
        subject: ctx.input.subject,
        message: ctx.input.message,
        ccMe: ctx.input.ccMe,
        rowIds: ctx.input.rowIds.map(Number),
        columnIds: ctx.input.columnIds?.map(Number)
      });
    } else {
      await client.sendSheetViaEmail(ctx.input.sheetId, {
        to: ctx.input.to.map(email => ({ email })),
        subject: ctx.input.subject,
        message: ctx.input.message,
        ccMe: ctx.input.ccMe,
        format: ctx.input.format
      });
    }

    return {
      output: { success: true },
      message: `Sent email to **${ctx.input.to.length}** recipient(s).`
    };
  })
  .build();

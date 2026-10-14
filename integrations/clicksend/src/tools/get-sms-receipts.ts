import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

type Receipt = {
  message_id: string;
  timestamp?: number | string;
  timestamp_send?: number | string;
  status_code?: string | number;
  status_text?: string;
  error_code?: string | number | null;
  error_text?: string | null;
  custom_string?: string | null;
};

export let getSmsReceiptsTool = SlateTool.create(spec, {
  name: 'Get SMS Delivery Receipts',
  key: 'get_sms_receipts',
  description:
    'Check SMS delivery status by message ID, including receipts already marked as read, or list unread delivery receipts with pagination.',
  instructions: [
    'Omit messageId to list unread receipts. Listing requires a delivery report rule with its action set to POLL in the ClickSend dashboard.',
    'Use message IDs returned by send_sms or get_sms_history to check individual messages.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      messageId: z
        .string()
        .optional()
        .describe('SMS message ID. Omit to list unread receipts.'),
      page: z.number().int().min(1).optional().describe('Page number when listing receipts'),
      limit: z
        .number()
        .int()
        .min(15)
        .max(100)
        .optional()
        .describe('Receipts per page, from 15 to 100')
    })
  )
  .output(
    z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number(),
      receipts: z.array(
        z.object({
          messageId: z.string(),
          timestamp: z.number().optional(),
          sentAt: z.number().optional(),
          statusCode: z.string().optional(),
          statusText: z.string().optional(),
          errorCode: z.string().optional(),
          errorText: z.string().optional(),
          customString: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient(ctx.auth);
    let result = await client.getSmsReceipts(ctx.input);
    let data = result.data;
    let rows: Receipt[] = ctx.input.messageId ? (data ? [data] : []) : (data?.data ?? []);
    let receipts = rows.map(receipt => ({
      messageId: receipt.message_id,
      timestamp: receipt.timestamp == null ? undefined : Number(receipt.timestamp),
      sentAt: receipt.timestamp_send == null ? undefined : Number(receipt.timestamp_send),
      statusCode: receipt.status_code == null ? undefined : String(receipt.status_code),
      statusText: receipt.status_text || undefined,
      errorCode: receipt.error_code == null ? undefined : String(receipt.error_code),
      errorText: receipt.error_text || undefined,
      customString: receipt.custom_string || undefined
    }));
    return {
      output: {
        currentPage: ctx.input.messageId ? 1 : (data?.current_page ?? 1),
        totalPages: ctx.input.messageId ? 1 : (data?.last_page ?? 1),
        totalCount: ctx.input.messageId ? receipts.length : (data?.total ?? receipts.length),
        receipts
      },
      message: `Retrieved ${receipts.length} SMS delivery receipt(s).`
    };
  })
  .build();

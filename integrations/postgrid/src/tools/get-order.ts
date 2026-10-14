import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient, resolveOrderType } from '../lib/client';
import { spec } from '../spec';
import { getPreviewRefreshAt } from './get-file-url';

export let getOrder = SlateTool.create(spec, {
  name: 'Get Mail Order',
  key: 'get_order',
  description: `Retrieve the details and current status of a PostGrid mail order. Supports letters, postcards, cheques, and self-mailers. Provide the order ID and the tool will automatically detect the order type from the ID prefix.`,
  instructions: [
    'Order IDs have prefixes indicating their type: letter_, postcard_, cheque_, self_mailer_.',
    'If the type cannot be determined from the ID, specify the orderType explicitly.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z.string().describe('The order ID (e.g., letter_abc123, postcard_xyz456)'),
      orderType: z
        .enum(['letter', 'postcard', 'cheque', 'self_mailer'])
        .optional()
        .describe('Order type. Auto-detected from ID prefix if not provided.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Order ID'),
      orderType: z.string().describe('Type of the mail order'),
      status: z
        .string()
        .describe(
          'Current status (e.g., ready, printing, processed_for_delivery, completed, cancelled)'
        ),
      live: z
        .boolean()
        .optional()
        .nullable()
        .describe('Whether this is a live (non-test) order'),
      trackingNumber: z
        .string()
        .optional()
        .nullable()
        .describe('USPS tracking number (if available)'),
      imbStatus: z.string().optional().nullable().describe('Intelligent Mail Barcode status'),
      url: z.string().optional().nullable().describe('URL to the rendered PDF'),
      sendDate: z.string().optional().nullable().describe('Scheduled or actual send date'),
      createdAt: z.string().optional().nullable().describe('Creation timestamp'),
      updatedAt: z.string().optional().nullable().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrintMailClient(ctx.auth.token);
    let { orderId, orderType } = ctx.input;

    orderType = resolveOrderType(orderId, orderType);

    let order = await client.getOrder(orderId, orderType);

    if (typeof order.url === 'string' && order.url) {
      await ctx.addAttachment({
        type: 'url',
        url: order.url,
        mimeType: 'application/pdf',
        refreshReference: { orderId: order.id, orderType: orderType },
        refreshAt: getPreviewRefreshAt(order.url)
      });
    }

    return {
      output: {
        orderId: order.id,
        orderType: orderType!,
        status: order.status,
        live: order.live,
        trackingNumber: order.trackingNumber,
        imbStatus: order.imbStatus,
        url: order.url,
        sendDate: order.sendDate,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      message: `**${orderType}** ${order.id} — status: **${order.status}**${order.trackingNumber ? `, tracking: ${order.trackingNumber}` : ''}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

let priceSchema = z.object({
  label: z.string().describe('Price label (e.g. "Product", "Tax", "Shipping")'),
  amount: z.number().describe('Price in the smallest units of the currency (e.g. cents)')
});

export let sendInvoiceTool = SlateTool.create(spec, {
  name: 'Send Invoice',
  key: 'send_invoice',
  description: `Send a payment invoice to a user or chat. Supports Telegram Stars and third-party payment providers. Can also generate a shareable invoice link instead of sending directly.`,
  instructions: [
    'For Telegram Stars payments, set currency to "XTR" and omit providerToken.',
    'For third-party providers, include the providerToken from your payment provider.',
    'Amounts are in the smallest currency unit (e.g. cents for USD).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mode: z
        .enum(['send', 'create_link'])
        .default('send')
        .describe(
          '"send" to send directly to a chat, "create_link" to generate a shareable link'
        ),
      chatId: z
        .string()
        .optional()
        .describe('Chat ID to send the invoice to (required for mode "send")'),
      title: z.string().describe('Product name (1-32 characters)'),
      description: z.string().describe('Product description (1-255 characters)'),
      invoicePayload: z
        .string()
        .describe('Bot-defined payload for identifying the invoice (not shown to user)'),
      currency: z
        .string()
        .describe('Three-letter ISO 4217 currency code, or "XTR" for Telegram Stars'),
      prices: z
        .array(priceSchema)
        .min(1)
        .describe('Price breakdown (product, tax, shipping, etc.)'),
      providerToken: z
        .string()
        .optional()
        .describe('Payment provider token. Omit for Telegram Stars.'),
      maxTipAmount: z
        .number()
        .optional()
        .describe('Maximum accepted tip in smallest currency units'),
      suggestedTipAmounts: z
        .array(z.number())
        .optional()
        .describe('Suggested tip amounts (up to 4 values)'),
      photoUrl: z.string().optional().describe('URL of the product photo for the invoice'),
      needName: z.boolean().optional().describe('Request buyer name'),
      needPhoneNumber: z.boolean().optional().describe('Request buyer phone number'),
      needEmail: z.boolean().optional().describe('Request buyer email'),
      needShippingAddress: z.boolean().optional().describe('Request buyer shipping address'),
      isFlexible: z
        .boolean()
        .optional()
        .describe('True if final price depends on shipping method'),
      disableNotification: z.boolean().optional().describe('Send silently'),
      messageThreadId: z.number().optional().describe('Forum topic thread ID')
    })
  )
  .output(
    z.object({
      messageId: z
        .number()
        .optional()
        .describe('ID of the sent invoice message (send mode only)'),
      chatId: z
        .string()
        .optional()
        .describe('Chat ID where the invoice was sent (send mode only)'),
      invoiceLink: z
        .string()
        .optional()
        .describe('Shareable invoice link (create_link mode only)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);

    if (ctx.input.mode === 'create_link') {
      let link = await client.createInvoiceLink({
        title: ctx.input.title,
        description: ctx.input.description,
        payload: ctx.input.invoicePayload,
        currency: ctx.input.currency,
        prices: ctx.input.prices,
        providerToken: ctx.input.providerToken
      });

      return {
        output: {
          messageId: undefined,
          chatId: undefined,
          invoiceLink: link
        },
        message: `Invoice link created: ${link}`
      };
    }

    if (!ctx.input.chatId) {
      throw new Error('chatId is required when mode is "send"');
    }

    let result = await client.sendInvoice({
      chatId: ctx.input.chatId,
      title: ctx.input.title,
      description: ctx.input.description,
      payload: ctx.input.invoicePayload,
      currency: ctx.input.currency,
      prices: ctx.input.prices,
      providerToken: ctx.input.providerToken,
      maxTipAmount: ctx.input.maxTipAmount,
      suggestedTipAmounts: ctx.input.suggestedTipAmounts,
      photoUrl: ctx.input.photoUrl,
      needName: ctx.input.needName,
      needPhoneNumber: ctx.input.needPhoneNumber,
      needEmail: ctx.input.needEmail,
      needShippingAddress: ctx.input.needShippingAddress,
      isFlexible: ctx.input.isFlexible,
      disableNotification: ctx.input.disableNotification,
      messageThreadId: ctx.input.messageThreadId
    });

    return {
      output: {
        messageId: result.message_id,
        chatId: String(result.chat.id),
        invoiceLink: undefined
      },
      message: `Invoice "${ctx.input.title}" sent to chat **${ctx.input.chatId}** (message ID: ${result.message_id}).`
    };
  })
  .build();

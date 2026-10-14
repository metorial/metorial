import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z.object({
  addressName: z.string().describe('Recipient full name'),
  addressLine1: z.string().describe('Street address line 1'),
  addressLine2: z.string().optional().describe('Street address line 2'),
  addressCity: z.string().describe('City'),
  addressState: z.string().describe('State or province'),
  addressPostalCode: z.string().describe('Postal or ZIP code'),
  addressCountry: z.string().describe('Two-letter ISO country code (e.g., US, AU, GB)'),
  returnAddressId: z
    .number()
    .optional()
    .describe('Required by ClickSend: ID of a saved return address from your account.'),
  schedule: z.number().optional().describe('Unix timestamp for scheduled dispatch')
});

export let sendLetterTool = SlateTool.create(spec, {
  name: 'Send Letter',
  key: 'send_letter',
  description: `Send physical letters via ClickSend's print-and-mail service. Upload an A4 PDF (via URL) and specify recipient addresses — the letter will be printed, enveloped, stamped, and dispatched automatically to addresses worldwide. Post is available only to existing customers with access to this service.`,
  instructions: [
    'The file URL must point to a valid A4-formatted PDF document',
    'Letters are printed in black and white by default; set colour to true for color printing',
    'Set duplex to true for double-sided printing'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileUrl: z.string().describe('Publicly accessible URL to the A4 PDF letter document'),
      recipients: z
        .array(addressSchema)
        .min(1)
        .describe('List of recipient mailing addresses'),
      colour: z
        .boolean()
        .optional()
        .describe('Print in colour (default: false / black & white)'),
      duplex: z
        .boolean()
        .optional()
        .describe('Print double-sided (default: false / single-sided)'),
      priorityPost: z
        .boolean()
        .optional()
        .describe('Use priority/express postal service (default: false)')
    })
  )
  .output(
    z.object({
      totalPrice: z.number().describe('Total cost of all letters'),
      queuedCount: z.number().describe('Number of letters queued for dispatch'),
      letters: z
        .array(
          z.object({
            letterId: z.string().optional().describe('Letter ID for tracking'),
            recipientName: z.string().describe('Recipient name'),
            addressLine1: z.string().describe('Recipient street address'),
            city: z.string().describe('Recipient city'),
            country: z.string().describe('Recipient country'),
            status: z.string().describe('Letter dispatch status')
          })
        )
        .describe('Details for each dispatched letter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    if (ctx.input.recipients.some(recipient => !recipient.returnAddressId)) {
      throw createApiServiceError(
        'Each letter recipient requires a returnAddressId from a saved ClickSend return address.',
        { reason: 'missing_return_address' }
      );
    }

    ctx.progress('Sending letters...');

    let result = await client.sendLetter({
      fileUrl: ctx.input.fileUrl,
      recipients: ctx.input.recipients,
      colour: ctx.input.colour ? 1 : 0,
      duplex: ctx.input.duplex ? 1 : 0,
      priorityPost: ctx.input.priorityPost ? 1 : 0
    });

    let sentLetters = result.data?.recipients || [];
    let mappedLetters = sentLetters.map((letter: any) => ({
      letterId: letter.message_id?.toString() || undefined,
      recipientName: letter.address_name || '',
      addressLine1: letter.address_line_1 || '',
      city: letter.address_city || '',
      country: letter.address_country || '',
      status: letter.status || ''
    }));

    let totalPrice = sentLetters.reduce(
      (sum: number, letter: any) => sum + (Number.parseFloat(letter.post_price) || 0),
      0
    );

    let queuedCount = sentLetters.filter((letter: any) => letter.status === 'SUCCESS').length;

    return {
      output: {
        totalPrice,
        queuedCount,
        letters: mappedLetters
      },
      message: `Queued **${queuedCount}** letter(s) for dispatch. Total cost: **$${totalPrice.toFixed(2)}**`
    };
  })
  .build();

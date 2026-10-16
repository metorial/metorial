import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let usStateSchema = z
  .string()
  .length(2)
  .describe('2-letter U.S. state abbreviation (e.g., "CA", "NY", "TX")');

export let sendPostcard = SlateTool.create(spec, {
  name: 'Send Postcard',
  key: 'send_postcard',
  description: `Send a physical postcard via U.S. mail through DocuPost. Provide recipient and sender addresses along with front and back image URLs for the postcard. Supports 4x6 and 6x9 postcard sizes.`,
  instructions: [
    'This submits physical mail and can incur charges. Check the dashboard before retrying an uncertain request.',
    'Front and back images must be 1875 x 1275 pixels; PNG is recommended.',
    'States must be 2-letter U.S. abbreviations (e.g., "CA", "NY").',
    'Recipient and sender names must be fewer than 40 characters.',
    'Ensure addresses are valid; invalid addresses will cause the mailing to fail.'
  ],
  constraints: [
    'Images must be exactly 1875 x 1275 pixels; PNG is recommended.',
    'Names (recipient and sender) must be fewer than 40 characters.',
    'Only U.S. addresses are supported.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientName: z
        .string()
        .max(40)
        .describe('Recipient full name. DocuPost requires fewer than 40 characters.'),
      recipientAddress1: z.string().describe('Recipient street address'),
      recipientAddress2: z
        .string()
        .optional()
        .describe('Recipient address line 2 (apt, suite, etc.)'),
      recipientCity: z.string().describe('Recipient city'),
      recipientState: usStateSchema,
      recipientZip: z.string().describe('Recipient 5-digit ZIP code'),
      senderName: z
        .string()
        .max(40)
        .describe('Sender full name. DocuPost requires fewer than 40 characters.'),
      senderAddress1: z.string().describe('Sender street address'),
      senderAddress2: z
        .string()
        .optional()
        .describe('Sender address line 2 (apt, suite, etc.)'),
      senderCity: z.string().describe('Sender city'),
      senderState: usStateSchema,
      senderZip: z.string().describe('Sender 5-digit ZIP code'),
      frontImageUrl: z
        .string()
        .describe('URL of the front image for the postcard (PNG, 1875x1275 pixels)'),
      backImageUrl: z
        .string()
        .describe('URL of the back image for the postcard (PNG, 1875x1275 pixels)'),
      size: z.enum(['4x6', '6x9']).optional().describe('Postcard size (default: 4x6)'),
      description: z
        .string()
        .optional()
        .describe('Internal description visible in dashboard and exports')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe(
          'Provider request status when supplied; otherwise the HTTP status code as text. This is not mail delivery status.'
        ),
      httpStatus: z.number().optional().describe('HTTP status code returned by DocuPost'),
      response: z.any().optional().describe('Raw response from the DocuPost API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendPostcard({
      toName: ctx.input.recipientName,
      toAddress1: ctx.input.recipientAddress1,
      toAddress2: ctx.input.recipientAddress2,
      toCity: ctx.input.recipientCity,
      toState: ctx.input.recipientState,
      toZip: ctx.input.recipientZip,
      fromName: ctx.input.senderName,
      fromAddress1: ctx.input.senderAddress1,
      fromAddress2: ctx.input.senderAddress2,
      fromCity: ctx.input.senderCity,
      fromState: ctx.input.senderState,
      fromZip: ctx.input.senderZip,
      frontImageUrl: ctx.input.frontImageUrl,
      backImageUrl: ctx.input.backImageUrl,
      size: ctx.input.size,
      description: ctx.input.description
    });

    return {
      output: {
        status: result.status,
        httpStatus: result.httpStatus,
        response: result.response
      },
      message:
        'Postcard request completed. Check the DocuPost dashboard for processing status and any available cancellation option.'
    };
  })
  .build();

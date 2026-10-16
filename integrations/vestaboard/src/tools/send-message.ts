import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  CloudClient,
  LocalClient,
  parseCharacterGrid,
  type SendMessageResult,
  SubscriptionClient
} from '../lib/client';
import { VbmlClient } from '../lib/vbml';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Display a message on a Vestaboard. Supports plain text (auto-centered) or a 2D character code array for precise positioning. Works with Cloud API, Subscription API, and Local API authentication.

For **Subscription API** users, a \`subscriptionId\` from **List Subscriptions** must be provided to target the board.

Use the **Compose VBML** tool first if you need advanced layout, styling, or dynamic content — then pass the resulting character array here.`,
  instructions: [
    'Plain text messages are automatically centered on the board.',
    'Character code arrays must match the board dimensions: 6x22 for Flagship, 3x15 for Note, or appropriate dimensions for Note Arrays.',
    'Character codes: 0=blank, 1-26=A-Z, 27-36=digits 1-0, 63=red, 64=orange, 65=yellow, 66=green, 67=blue, 68=violet, 69=white, 70=black, 71=filled (Cloud only). Local color appearance depends on board color.'
  ],
  constraints: [
    'Rate limit: messages sent more frequently than every 15 seconds may be dropped.',
    'Local API sends character arrays; text is converted using the public formatting service. Provide rows and columns for a non-Flagship board.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe(
          'Plain text message to display. Lines will be centered horizontally and vertically. Cannot be used with characters.'
        ),
      characters: z
        .array(z.array(z.number()))
        .optional()
        .describe(
          '2D array of character codes for precise positioning. Dimensions must match the target board (e.g. 6x22 for Flagship, 3x15 for Note).'
        ),
      subscriptionId: z
        .string()
        .optional()
        .describe(
          'Required when using Subscription API auth. Call list_subscriptions to discover subscription IDs for target boards.'
        ),
      forced: z
        .boolean()
        .optional()
        .describe('Override configured quiet hours. Only supported by the Cloud API.'),
      rows: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Rows for formatting Local API text. Default: 6. Use 3 for Vestaboard Note; only used with text and Local API auth.'
        ),
      columns: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Columns for formatting Local API text. Default: 22. Use 15 for Vestaboard Note; only used with text and Local API auth.'
        ),
      localTransition: z
        .object({
          strategy: z
            .enum(['column', 'reverse-column', 'edges-to-center', 'row', 'diagonal', 'random'])
            .describe('Local API animation strategy for this message.'),
          stepIntervalMs: z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe(
              'Delay in milliseconds between animation steps. Omit to advance as quickly as possible.'
            ),
          stepSize: z
            .number()
            .int()
            .positive()
            .optional()
            .describe(
              'Number of rows, columns, or random positions updated at each step. Default: 1.'
            )
        })
        .optional()
        .describe('Per-message animation options. Supported only by the Local API.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the send operation.'),
      messageId: z
        .string()
        .optional()
        .describe('ID of the created message, if returned by the API.'),
      created: z
        .number()
        .optional()
        .describe('Timestamp of message creation, if returned by the API.'),
      muted: z
        .boolean()
        .optional()
        .describe('Whether the Subscription API marked this message as muted.'),
      response: z.unknown().optional().describe('Complete response returned by the provider.')
    })
  )
  .handleInvocation(async ctx => {
    let { text, characters, subscriptionId, forced, rows, columns, localTransition } =
      ctx.input;
    let { apiType } = ctx.auth;

    if (text === undefined && characters === undefined) {
      throw createApiServiceError('Either text or characters must be provided.');
    }
    if (text !== undefined && characters !== undefined) {
      throw createApiServiceError('Provide either text or characters, not both.');
    }
    if (text !== undefined && !text.trim()) {
      throw createApiServiceError(
        'Text must contain a message. To clear a Local API board, send a blank character array.'
      );
    }
    if (forced && apiType !== 'cloud') {
      throw createApiServiceError(
        'The forced quiet-hours override is only supported by the Cloud API.'
      );
    }
    if (localTransition && apiType !== 'local') {
      throw createApiServiceError(
        'Per-message localTransition options require Local API authentication.'
      );
    }
    if (
      (rows !== undefined || columns !== undefined) &&
      (apiType !== 'local' || text === undefined)
    ) {
      throw createApiServiceError(
        'Rows and columns are only used when formatting text with Local API authentication.'
      );
    }
    if (characters !== undefined) {
      characters = parseCharacterGrid(characters, 'Message characters');
    }

    if (text && apiType === 'local') {
      ctx.info(
        'Local API requires character codes. Converting text via VBML format endpoint.'
      );
      let vbml = new VbmlClient();
      characters = await vbml.format(text, rows, columns);
      text = undefined;
    }

    if (apiType === 'local' && characters?.some(row => row.includes(71))) {
      throw createApiServiceError(
        'Character code 71 is not supported by the Local API. Use code 69 or 70 for solid colors.'
      );
    }

    let result: SendMessageResult;

    if (apiType === 'cloud') {
      let client = new CloudClient(ctx.auth.token);
      if (text) {
        result = await client.sendText(text, forced);
      } else {
        result = await client.sendCharacters(characters!, forced);
      }
    } else if (apiType === 'subscription') {
      if (!subscriptionId) {
        throw createApiServiceError(
          'subscriptionId is required when using the Subscription API. Call list_subscriptions to discover it.'
        );
      }
      let client = new SubscriptionClient(ctx.auth.token, ctx.auth.apiSecret);
      if (text) {
        result = await client.sendText(subscriptionId, text);
      } else {
        result = await client.sendCharacters(subscriptionId, characters!);
      }
    } else if (apiType === 'local') {
      let client = new LocalClient(
        ctx.auth.token,
        ctx.auth.baseUrl ?? 'http://vestaboard.local:7000'
      );
      result = await client.sendCharacters(characters!, localTransition);
    } else {
      throw createApiServiceError(`Unsupported API type: ${apiType}`);
    }

    let messageType = text ? 'text' : 'character array';
    return {
      output: {
        status: result.status,
        messageId: result.messageId,
        created: result.created,
        muted: result.muted,
        response: result.response
      },
      message: `Message ${result.muted ? 'accepted but muted' : 'submitted'} as ${messageType} via the **${apiType}** API.${result.messageId ? ` Message ID: \`${result.messageId}\`` : ''}`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudClient, LocalClient, SubscriptionClient } from '../lib/client';
import { VbmlClient } from '../lib/vbml';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Display a message on a Vestaboard. Supports plain text (auto-centered) or a 2D character code array for precise positioning. Works with Cloud API, Subscription API, and Local API authentication.

For **Subscription API** users, a \`subscriptionId\` must be provided to target the board.

Use the **Compose VBML** tool first if you need advanced layout, styling, or dynamic content — then pass the resulting character array here.`,
  instructions: [
    'Plain text messages are automatically centered on the board.',
    'Character code arrays must match the board dimensions: 6x22 for Flagship, 3x15 for Note, or appropriate dimensions for Note Arrays.',
    'Character codes: 0=blank, 1-26=A-Z, 27-36=digits 1-0, 63=red, 64=orange, 65=yellow, 66=green, 67=blue, 68=violet, 69=white, 70=black.'
  ],
  constraints: [
    'Rate limit: messages sent more frequently than every 15 seconds may be dropped.',
    'Local API only supports character code arrays, not plain text.'
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
          'Required when using Subscription API auth. The subscription ID of the target board.'
        ),
      forced: z
        .boolean()
        .optional()
        .describe('Override configured quiet hours. Only supported by the Cloud API.')
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
        .describe('Timestamp of message creation, if returned by the API.')
    })
  )
  .handleInvocation(async ctx => {
    let { text, characters, subscriptionId, forced } = ctx.input;
    let { apiType } = ctx.auth;

    if (!text && !characters) {
      throw new Error('Either text or characters must be provided.');
    }
    if (text && characters) {
      throw new Error('Provide either text or characters, not both.');
    }

    // If text is provided and we're using Local API, convert to characters first
    if (text && apiType === 'local') {
      ctx.info(
        'Local API requires character codes. Converting text via VBML format endpoint.'
      );
      let vbml = new VbmlClient();
      characters = await vbml.format(text);
      text = undefined;
    }

    let result: any;

    if (apiType === 'cloud') {
      let client = new CloudClient(ctx.auth.token);
      if (text) {
        result = await client.sendText(text, forced);
      } else {
        result = await client.sendCharacters(characters!, forced);
      }
    } else if (apiType === 'subscription') {
      if (!subscriptionId) {
        throw new Error('subscriptionId is required when using the Subscription API.');
      }
      let client = new SubscriptionClient(ctx.auth.token, ctx.auth.apiSecret!);
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
      result = await client.sendCharacters(characters!);
    } else {
      throw new Error(`Unsupported API type: ${apiType}`);
    }

    let messageType = text ? 'text' : 'character array';
    return {
      output: {
        status: result.status,
        messageId: result.messageId,
        created: result.created
      },
      message: `Message sent successfully as ${messageType} via the **${apiType}** API.${result.messageId ? ` Message ID: \`${result.messageId}\`` : ''}`
    };
  })
  .build();

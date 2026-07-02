import { SlateTool } from 'slates';
import { z } from 'zod';
import { CloudClient, LocalClient } from '../lib/client';
import { spec } from '../spec';

export let readMessage = SlateTool.create(spec, {
  name: 'Read Current Message',
  key: 'read_message',
  description: `Retrieve the current message displayed on a Vestaboard as a 2D array of character codes. Each code represents a character or color on the board.

Available via the **Cloud API** and **Local API** only (not supported by the Subscription API).`,
  instructions: [
    'Character codes: 0=blank, 1-26=A-Z, 27-36=digits 1-0, 63=red, 64=orange, 65=yellow, 66=green, 67=blue, 68=violet, 69=white, 70=black.'
  ],
  constraints: ['Not available when using the Subscription API.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      layout: z
        .array(z.array(z.number()))
        .describe('2D array of character codes currently displayed on the board.'),
      messageId: z.string().optional().describe('ID of the current message, if available.')
    })
  )
  .handleInvocation(async ctx => {
    let { apiType } = ctx.auth;

    if (apiType === 'subscription') {
      throw new Error(
        'Reading the current message is not supported by the Subscription API. Use the Cloud API or Local API instead.'
      );
    }

    let result: any;

    if (apiType === 'cloud') {
      let client = new CloudClient(ctx.auth.token);
      result = await client.readMessage();
    } else if (apiType === 'local') {
      let client = new LocalClient(
        ctx.auth.token,
        ctx.auth.baseUrl ?? 'http://vestaboard.local:7000'
      );
      result = await client.readMessage();
    } else {
      throw new Error(`Unsupported API type: ${apiType}`);
    }

    let rows = result.layout.length;
    let cols = result.layout[0]?.length ?? 0;

    return {
      output: {
        layout: result.layout,
        messageId: result.messageId
      },
      message: `Retrieved current board message (${rows}x${cols} grid) via the **${apiType}** API.${result.messageId ? ` Message ID: \`${result.messageId}\`` : ''}`
    };
  })
  .build();

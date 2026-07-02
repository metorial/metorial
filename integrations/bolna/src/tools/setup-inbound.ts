import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setupInbound = SlateTool.create(spec, {
  name: 'Setup Inbound',
  key: 'setup_inbound',
  description: `Link or unlink a Bolna agent to a phone number for handling inbound calls. When linked, the agent automatically answers incoming calls to that number.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['link', 'unlink'])
        .describe(
          '"link" to assign an agent to a phone number, "unlink" to remove the assignment'
        ),
      phoneNumberId: z.string().describe('ID of the phone number'),
      agentId: z
        .string()
        .optional()
        .describe('ID of the agent to link (required for "link" action)')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().optional().describe('Phone number affected'),
      inboundUrl: z.string().optional().describe('Inbound webhook URL (when linked)'),
      status: z.string().describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'link') {
      if (!ctx.input.agentId) throw new Error('agentId is required to link an agent');

      let result = await client.setupInbound(ctx.input.agentId, ctx.input.phoneNumberId);

      return {
        output: {
          phoneNumber: result.phone_number,
          inboundUrl: result.url,
          status: 'linked'
        },
        message: `Linked agent \`${ctx.input.agentId}\` to phone number **${result.phone_number}**.`
      };
    }

    let result = await client.unlinkInbound(ctx.input.phoneNumberId);

    return {
      output: {
        phoneNumber: result.phone_number,
        inboundUrl: undefined,
        status: 'unlinked'
      },
      message: `Unlinked agent from phone number **${result.phone_number}**.`
    };
  })
  .build();

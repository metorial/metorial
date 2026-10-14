import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

let whatsappNumberSchema = z.object({
  channelUuid: z
    .string()
    .optional()
    .describe('Connected number UUID for channel and conversation operations'),
  phoneNumber: z.string().optional().describe('The phone number'),
  alias: z.string().optional().describe('Alias/display name for the number'),
  status: z
    .string()
    .optional()
    .describe('Current status of the number (e.g., ready, disconnected)'),
  channelType: z
    .string()
    .optional()
    .describe('Channel type (e.g., whatsapp_web, whatsapp_business_api)'),
  createdAt: z.string().optional().describe('When the number was connected')
});

export let listWhatsAppNumbers = SlateTool.create(spec, {
  name: 'List WhatsApp Numbers',
  key: 'list_whatsapp_numbers',
  description: `Retrieve a page of WhatsApp numbers connected to your 2Chat account. Returns details about each number including its status and channel type.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().int().min(0).optional().describe('Zero-based page, default 0'),
      resultsPerPage: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Numbers per page; default 50'),
      status: z
        .enum(['connected', 'disconnected', 'all'])
        .optional()
        .describe('Connection status filter')
    })
  )
  .output(
    z.object({
      numbers: z.array(whatsappNumberSchema).describe('List of connected WhatsApp numbers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });
    let result = await client.listWhatsAppNumbers(ctx.input);

    let numbers = (result.numbers || result.data || []).map((n: any) => ({
      channelUuid: n.uuid ?? undefined,
      phoneNumber: n.phone_number || n.number,
      alias: n.friendly_name ?? n.alias ?? n.name ?? undefined,
      status: n.connection_status ?? n.status ?? undefined,
      channelType: n.channel_type,
      createdAt: n.created_at ?? undefined
    }));

    return {
      output: { numbers },
      message: `Found **${numbers.length}** connected WhatsApp number(s).`
    };
  })
  .build();

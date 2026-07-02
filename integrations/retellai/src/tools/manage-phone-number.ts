import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

let phoneNumberOutputSchema = z.object({
  phoneNumber: z.string().describe('Phone number in E.164 format'),
  phoneNumberType: z
    .string()
    .optional()
    .describe('Type: retell-twilio, retell-telnyx, or custom'),
  phoneNumberPretty: z.string().optional().describe('Formatted display version'),
  nickname: z.string().nullable().optional().describe('User-friendly label'),
  inboundAgents: z.any().optional().describe('Inbound agents with weights'),
  outboundAgents: z.any().optional().describe('Outbound agents with weights'),
  areaCode: z.number().optional().describe('Area code'),
  lastModificationTimestamp: z.number().optional().describe('Last modification timestamp')
});

export let listPhoneNumbers = SlateTool.create(spec, {
  name: 'List Phone Numbers',
  key: 'list_phone_numbers',
  description: `List all phone numbers in your Retell AI account, including their assigned agents, type, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      phoneNumbers: z.array(phoneNumberOutputSchema).describe('List of phone numbers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let numbers = await client.listPhoneNumbers();

    let mapped = (numbers as any[]).map((n: any) => ({
      phoneNumber: n.phone_number,
      phoneNumberType: n.phone_number_type,
      phoneNumberPretty: n.phone_number_pretty,
      nickname: n.nickname,
      inboundAgents: n.inbound_agents,
      outboundAgents: n.outbound_agents,
      areaCode: n.area_code,
      lastModificationTimestamp: n.last_modification_timestamp
    }));

    return {
      output: { phoneNumbers: mapped },
      message: `Found **${mapped.length}** phone number(s).`
    };
  })
  .build();

export let getPhoneNumber = SlateTool.create(spec, {
  name: 'Get Phone Number',
  key: 'get_phone_number',
  description: `Retrieve details of a specific phone number, including assigned agents, webhooks, and country restrictions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g. +14157774444)')
    })
  )
  .output(phoneNumberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let n = await client.getPhoneNumber(ctx.input.phoneNumber);

    return {
      output: {
        phoneNumber: n.phone_number,
        phoneNumberType: n.phone_number_type,
        phoneNumberPretty: n.phone_number_pretty,
        nickname: n.nickname,
        inboundAgents: n.inbound_agents,
        outboundAgents: n.outbound_agents,
        areaCode: n.area_code,
        lastModificationTimestamp: n.last_modification_timestamp
      },
      message: `Retrieved phone number **${n.phone_number_pretty || n.phone_number}**.`
    };
  })
  .build();

export let purchasePhoneNumber = SlateTool.create(spec, {
  name: 'Purchase Phone Number',
  key: 'purchase_phone_number',
  description: `Purchase a new phone number from Retell. Specify an area code and optionally assign inbound/outbound agents.`,
  constraints: ['Currently only supports US and CA area codes.']
})
  .input(
    z.object({
      areaCode: z.number().optional().describe('3-digit area code for the number to obtain'),
      countryCode: z.enum(['US', 'CA']).optional().describe('Country code (default US)'),
      nickname: z.string().optional().describe('User-friendly label for the number'),
      numberProvider: z
        .enum(['twilio', 'telnyx'])
        .optional()
        .describe('Phone number provider (default twilio)'),
      tollFree: z.boolean().optional().describe('Whether to purchase a toll-free number'),
      inboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID'),
            weight: z
              .number()
              .describe('Weight for random selection (all weights must sum to 1)')
          })
        )
        .optional()
        .describe('Inbound agents with weights'),
      outboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID'),
            weight: z
              .number()
              .describe('Weight for random selection (all weights must sum to 1)')
          })
        )
        .optional()
        .describe('Outbound agents with weights'),
      inboundWebhookUrl: z.string().optional().describe('Webhook URL for inbound calls')
    })
  )
  .output(phoneNumberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.areaCode !== undefined) body.area_code = ctx.input.areaCode;
    if (ctx.input.countryCode) body.country_code = ctx.input.countryCode;
    if (ctx.input.nickname) body.nickname = ctx.input.nickname;
    if (ctx.input.numberProvider) body.number_provider = ctx.input.numberProvider;
    if (ctx.input.tollFree !== undefined) body.toll_free = ctx.input.tollFree;
    if (ctx.input.inboundWebhookUrl) body.inbound_webhook_url = ctx.input.inboundWebhookUrl;

    if (ctx.input.inboundAgents) {
      body.inbound_agents = ctx.input.inboundAgents.map(a => ({
        agent_id: a.agentId,
        weight: a.weight
      }));
    }
    if (ctx.input.outboundAgents) {
      body.outbound_agents = ctx.input.outboundAgents.map(a => ({
        agent_id: a.agentId,
        weight: a.weight
      }));
    }

    let n = await client.createPhoneNumber(body);

    return {
      output: {
        phoneNumber: n.phone_number,
        phoneNumberType: n.phone_number_type,
        phoneNumberPretty: n.phone_number_pretty,
        nickname: n.nickname,
        inboundAgents: n.inbound_agents,
        outboundAgents: n.outbound_agents,
        areaCode: n.area_code,
        lastModificationTimestamp: n.last_modification_timestamp
      },
      message: `Purchased phone number **${n.phone_number_pretty || n.phone_number}**.`
    };
  })
  .build();

export let updatePhoneNumber = SlateTool.create(spec, {
  name: 'Update Phone Number',
  key: 'update_phone_number',
  description: `Update configuration of an existing phone number, including assigned agents, webhooks, and country restrictions.`
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format to update'),
      nickname: z.string().nullable().optional().describe('Updated nickname (null to remove)'),
      inboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID'),
            weight: z.number().describe('Weight')
          })
        )
        .nullable()
        .optional()
        .describe('Updated inbound agents with weights (null to remove)'),
      outboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID'),
            weight: z.number().describe('Weight')
          })
        )
        .nullable()
        .optional()
        .describe('Updated outbound agents with weights (null to remove)'),
      inboundWebhookUrl: z
        .string()
        .nullable()
        .optional()
        .describe('Updated inbound webhook URL (null to remove)')
    })
  )
  .output(phoneNumberOutputSchema)
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.nickname !== undefined) body.nickname = ctx.input.nickname;
    if (ctx.input.inboundWebhookUrl !== undefined)
      body.inbound_webhook_url = ctx.input.inboundWebhookUrl;

    if (ctx.input.inboundAgents !== undefined) {
      body.inbound_agents = ctx.input.inboundAgents
        ? ctx.input.inboundAgents.map(a => ({ agent_id: a.agentId, weight: a.weight }))
        : null;
    }
    if (ctx.input.outboundAgents !== undefined) {
      body.outbound_agents = ctx.input.outboundAgents
        ? ctx.input.outboundAgents.map(a => ({ agent_id: a.agentId, weight: a.weight }))
        : null;
    }

    let n = await client.updatePhoneNumber(ctx.input.phoneNumber, body);

    return {
      output: {
        phoneNumber: n.phone_number,
        phoneNumberType: n.phone_number_type,
        phoneNumberPretty: n.phone_number_pretty,
        nickname: n.nickname,
        inboundAgents: n.inbound_agents,
        outboundAgents: n.outbound_agents,
        areaCode: n.area_code,
        lastModificationTimestamp: n.last_modification_timestamp
      },
      message: `Updated phone number **${n.phone_number_pretty || n.phone_number}**.`
    };
  })
  .build();

export let deletePhoneNumber = SlateTool.create(spec, {
  name: 'Delete Phone Number',
  key: 'delete_phone_number',
  description: `Delete a phone number from your Retell AI account. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    await client.deletePhoneNumber(ctx.input.phoneNumber);

    return {
      output: { success: true },
      message: `Deleted phone number **${ctx.input.phoneNumber}**.`
    };
  })
  .build();

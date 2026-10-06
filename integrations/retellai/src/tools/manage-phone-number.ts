import { createApiServiceError, SlateTool } from 'slates';
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
  allowedInboundCountries: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Allowed inbound country codes'),
  allowedOutboundCountries: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Allowed outbound country codes'),
  inboundWebhookUrl: z.string().nullable().optional().describe('Inbound call webhook'),
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
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum numbers per page, default 50'),
      paginationKey: z
        .string()
        .optional()
        .describe('Opaque cursor from the previous list_phone_numbers response'),
      sortOrder: z.enum(['ascending', 'descending']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      phoneNumbers: z.array(phoneNumberOutputSchema).describe('List of phone numbers'),
      hasMore: z.boolean().describe('Whether more numbers are available'),
      paginationKey: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let page = await client.listPhoneNumbers(ctx.input);

    let mapped = page.items.map(n => ({
      phoneNumber: n.phone_number,
      allowedInboundCountries: n.allowed_inbound_country_list,
      allowedOutboundCountries: n.allowed_outbound_country_list,
      inboundWebhookUrl: n.inbound_webhook_url,
      phoneNumberType: n.phone_number_type,
      phoneNumberPretty: n.phone_number_pretty,
      nickname: n.nickname,
      inboundAgents: n.inbound_agents,
      outboundAgents: n.outbound_agents,
      areaCode: n.area_code,
      lastModificationTimestamp: n.last_modification_timestamp
    }));

    return {
      output: {
        phoneNumbers: mapped,
        hasMore: page.has_more,
        paginationKey: page.pagination_key
      },
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
        allowedInboundCountries: n.allowed_inbound_country_list,
        allowedOutboundCountries: n.allowed_outbound_country_list,
        inboundWebhookUrl: n.inbound_webhook_url,
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
      areaCode: z
        .number()
        .int()
        .min(100)
        .max(999)
        .optional()
        .describe('3-digit area code for the number to obtain'),
      countryCode: z.enum(['US', 'CA']).optional().describe('Country code (default US)'),
      allowedInboundCountries: z
        .array(z.string().length(2))
        .optional()
        .describe('Allowed inbound ISO country codes; empty permits all'),
      allowedOutboundCountries: z
        .array(z.string().length(2))
        .optional()
        .describe('Allowed outbound ISO country codes'),
      nickname: z.string().optional().describe('User-friendly label for the number'),
      numberProvider: z
        .enum(['twilio', 'telnyx'])
        .optional()
        .describe('Phone number provider (default twilio)'),
      tollFree: z.boolean().optional().describe('Whether to purchase a toll-free number'),
      inboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID from list_agents'),
            agentVersion: z
              .union([z.number().int().min(0), z.string().min(1)])
              .optional()
              .describe('Version or environment tag such as latest_published'),
            weight: z
              .number()
              .describe('Positive weight for random selection (all weights must sum to 1)')
          })
        )
        .optional()
        .describe('Inbound agents with weights'),
      outboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID from list_agents'),
            agentVersion: z
              .union([z.number().int().min(0), z.string().min(1)])
              .optional()
              .describe('Version or environment tag such as latest_published'),
            weight: z
              .number()
              .describe('Positive weight for random selection (all weights must sum to 1)')
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

    for (let agents of [ctx.input.inboundAgents, ctx.input.outboundAgents]) {
      if (
        agents?.length &&
        (agents.some(
          agent => !Number.isFinite(agent.weight) || agent.weight <= 0 || agent.weight > 1
        ) ||
          Math.abs(agents.reduce((total, agent) => total + agent.weight, 0) - 1) > 1e-6)
      ) {
        throw createApiServiceError(
          'Agent weights must be greater than 0, at most 1, and sum to 1.'
        );
      }
    }
    let body: Record<string, any> = {};
    if (ctx.input.allowedInboundCountries !== undefined)
      body.allowed_inbound_country_list = ctx.input.allowedInboundCountries;
    if (ctx.input.allowedOutboundCountries !== undefined)
      body.allowed_outbound_country_list = ctx.input.allowedOutboundCountries;
    if (ctx.input.areaCode !== undefined) body.area_code = ctx.input.areaCode;
    if (ctx.input.countryCode) body.country_code = ctx.input.countryCode;
    if (ctx.input.nickname) body.nickname = ctx.input.nickname;
    if (ctx.input.numberProvider) body.number_provider = ctx.input.numberProvider;
    if (ctx.input.tollFree !== undefined) body.toll_free = ctx.input.tollFree;
    if (ctx.input.inboundWebhookUrl) body.inbound_webhook_url = ctx.input.inboundWebhookUrl;

    if (ctx.input.inboundAgents) {
      body.inbound_agents = ctx.input.inboundAgents.map(a => ({
        agent_id: a.agentId,
        weight: a.weight,
        agent_version: a.agentVersion
      }));
    }
    if (ctx.input.outboundAgents) {
      body.outbound_agents = ctx.input.outboundAgents.map(a => ({
        agent_id: a.agentId,
        weight: a.weight,
        agent_version: a.agentVersion
      }));
    }

    let n = await client.createPhoneNumber(body);

    return {
      output: {
        phoneNumber: n.phone_number,
        allowedInboundCountries: n.allowed_inbound_country_list,
        allowedOutboundCountries: n.allowed_outbound_country_list,
        inboundWebhookUrl: n.inbound_webhook_url,
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
      allowedInboundCountries: z
        .array(z.string().length(2))
        .nullable()
        .optional()
        .describe('Allowed inbound ISO country codes; null clears the restriction'),
      allowedOutboundCountries: z
        .array(z.string().length(2))
        .nullable()
        .optional()
        .describe('Allowed outbound ISO country codes; null clears the restriction'),
      nickname: z.string().nullable().optional().describe('Updated nickname (null to remove)'),
      inboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID from list_agents'),
            agentVersion: z
              .union([z.number().int().min(0), z.string().min(1)])
              .optional()
              .describe('Version or environment tag such as latest_published'),
            weight: z.number().describe('Positive weight; all weights must sum to 1')
          })
        )
        .nullable()
        .optional()
        .describe('Updated inbound agents with weights (null to remove)'),
      outboundAgents: z
        .array(
          z.object({
            agentId: z.string().describe('Agent ID from list_agents'),
            agentVersion: z
              .union([z.number().int().min(0), z.string().min(1)])
              .optional()
              .describe('Version or environment tag such as latest_published'),
            weight: z.number().describe('Positive weight; all weights must sum to 1')
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

    for (let agents of [ctx.input.inboundAgents, ctx.input.outboundAgents]) {
      if (
        agents?.length &&
        (agents.some(
          agent => !Number.isFinite(agent.weight) || agent.weight <= 0 || agent.weight > 1
        ) ||
          Math.abs(agents.reduce((total, agent) => total + agent.weight, 0) - 1) > 1e-6)
      ) {
        throw createApiServiceError(
          'Agent weights must be greater than 0, at most 1, and sum to 1.'
        );
      }
    }
    let body: Record<string, any> = {};
    if (ctx.input.allowedInboundCountries !== undefined)
      body.allowed_inbound_country_list = ctx.input.allowedInboundCountries;
    if (ctx.input.allowedOutboundCountries !== undefined)
      body.allowed_outbound_country_list = ctx.input.allowedOutboundCountries;
    if (ctx.input.nickname !== undefined) body.nickname = ctx.input.nickname;
    if (ctx.input.inboundWebhookUrl !== undefined)
      body.inbound_webhook_url = ctx.input.inboundWebhookUrl;

    if (ctx.input.inboundAgents !== undefined) {
      body.inbound_agents = ctx.input.inboundAgents
        ? ctx.input.inboundAgents.map(a => ({
            agent_id: a.agentId,
            weight: a.weight,
            agent_version: a.agentVersion
          }))
        : null;
    }
    if (ctx.input.outboundAgents !== undefined) {
      body.outbound_agents = ctx.input.outboundAgents
        ? ctx.input.outboundAgents.map(a => ({
            agent_id: a.agentId,
            weight: a.weight,
            agent_version: a.agentVersion
          }))
        : null;
    }

    let n = await client.updatePhoneNumber(ctx.input.phoneNumber, body);

    return {
      output: {
        phoneNumber: n.phone_number,
        allowedInboundCountries: n.allowed_inbound_country_list,
        allowedOutboundCountries: n.allowed_outbound_country_list,
        inboundWebhookUrl: n.inbound_webhook_url,
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

import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

export let listWhatsAppTemplates = SlateTool.create(spec, {
  name: 'List WhatsApp Templates',
  key: 'list_whatsapp_templates',
  description: `Retrieve all approved WhatsApp message templates available in your account. Templates are required for first-time messages to contacts.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(z.any()).describe('List of approved WhatsApp templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let templates = await client.listWhatsAppTemplates();
    let list = Array.isArray(templates) ? templates : [];
    return {
      output: { templates: list },
      message: `Found **${list.length}** WhatsApp template(s).`
    };
  })
  .build();

export let sendWhatsAppCampaign = SlateTool.create(spec, {
  name: 'Send WhatsApp Campaign',
  key: 'send_whatsapp_campaign',
  description: `Send a WhatsApp campaign to groups or contacts. First-time messages to a contact require an approved template. Free-form content is only allowed if the contact replied within the last 24 hours.`,
  instructions: [
    'For first-time messages, use an approved template (see List WhatsApp Templates).',
    'Free-form content and attachments are only allowed within the 24-hour reply window.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      campaignData: z
        .record(z.string(), z.any())
        .describe('Full WhatsApp campaign payload as required by the ActiveTrail API')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Campaign send result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.sendWhatsAppCampaign(ctx.input.campaignData);
    return {
      output: { result },
      message: `WhatsApp campaign sent.`
    };
  })
  .build();

export let sendWhatsAppOperationalMessage = SlateTool.create(spec, {
  name: 'Send WhatsApp Operational Message',
  key: 'send_whatsapp_operational_message',
  description: `Send an individual WhatsApp operational/transactional message to a single contact. Requires an approved template for first-time messages.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      messageData: z
        .record(z.string(), z.any())
        .describe(
          'Full WhatsApp operational message payload as required by the ActiveTrail API'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Message send result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.sendWhatsAppOperationalMessage(ctx.input.messageData);
    return {
      output: { result },
      message: `WhatsApp operational message sent.`
    };
  })
  .build();

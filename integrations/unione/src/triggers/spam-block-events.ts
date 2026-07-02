import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let spamBlockTrigger = SlateTrigger.create(spec, {
  name: 'Spam Block Event',
  key: 'spam_block_event',
  description:
    'Triggers when sending is blocked or unblocked by a recipient domain SMTP server. Includes domain name, block type, and whether it is a block or unblock event.'
})
  .input(
    z.object({
      eventName: z.string().describe('Event type name'),
      eventId: z.string().describe('Unique event identifier'),
      domain: z.string().describe('Blocked domain name'),
      blockType: z.string().optional().describe('Block type (single or multiple SMTP)'),
      blockedSmtpCount: z.number().optional().describe('Number of blocked SMTPs'),
      isBlock: z.boolean().describe('Whether this is a block (true) or unblock (false) event'),
      eventTime: z.string().optional().describe('Event timestamp'),
      userId: z.number().optional().describe('UniOne user ID'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Affected domain name'),
      blockType: z.string().optional().describe('Type of block (single or multiple SMTP)'),
      blockedSmtpCount: z.number().optional().describe('Number of blocked SMTP connections'),
      isBlock: z.boolean().describe('True if sending is blocked, false if unblocked'),
      eventTime: z.string().optional().describe('Event timestamp'),
      userId: z.number().optional().describe('UniOne user ID'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        datacenter: ctx.config.datacenter
      });

      let result = await client.setWebhook({
        url: ctx.input.webhookBaseUrl,
        status: 'active',
        event_format: 'json_post',
        delivery_info: 1,
        single_event: 0,
        max_parallel: 10,
        events: {
          spam_block: ['*']
        }
      });

      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl,
          webhookId: result.object?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        datacenter: ctx.config.datacenter
      });

      let webhookUrl = ctx.input.registrationDetails?.webhookUrl ?? ctx.input.webhookBaseUrl;
      await client.deleteWebhook(webhookUrl);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let inputs: Array<{
        eventName: string;
        eventId: string;
        domain: string;
        blockType?: string;
        blockedSmtpCount?: number;
        isBlock: boolean;
        eventTime?: string;
        userId?: number;
        projectId?: string;
        projectName?: string;
      }> = [];

      let eventsByUser = body.events_by_user ?? [];

      for (let userGroup of eventsByUser) {
        let events = userGroup.events ?? [];
        for (let event of events) {
          if (event.event_name !== 'transactional_spam_block') continue;

          let eventData = event.event_data ?? {};

          inputs.push({
            eventName: event.event_name,
            eventId: `${eventData.domain}-${eventData.block_type ?? 'unknown'}-${eventData.block_time ?? Date.now()}`,
            domain: eventData.domain ?? '',
            blockType: eventData.block_type,
            blockedSmtpCount: eventData.blocked_smtp_count,
            isBlock: eventData.is_block !== false && eventData.is_block !== 0,
            eventTime: eventData.block_time ?? eventData.event_time,
            userId: userGroup.user_id,
            projectId: userGroup.project_id,
            projectName: userGroup.project_name
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.isBlock ? 'spam_block.blocked' : 'spam_block.unblocked';

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          domain: ctx.input.domain,
          blockType: ctx.input.blockType,
          blockedSmtpCount: ctx.input.blockedSmtpCount,
          isBlock: ctx.input.isBlock,
          eventTime: ctx.input.eventTime,
          userId: ctx.input.userId,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName
        }
      };
    }
  })
  .build();

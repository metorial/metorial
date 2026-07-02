import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailStatusTrigger = SlateTrigger.create(spec, {
  name: 'Email Status Event',
  key: 'email_status_event',
  description:
    'Triggers when the delivery status of a sent email changes. Covers events like delivered, opened, clicked, unsubscribed, subscribed, bounced, and spam reports.'
})
  .input(
    z.object({
      eventName: z.string().describe('Event type name'),
      eventId: z.string().describe('Unique event identifier'),
      jobId: z.string().describe('Job ID of the email'),
      recipientEmail: z.string().describe('Recipient email address'),
      status: z.string().describe('Email delivery status'),
      eventTime: z.string().describe('Timestamp of the event'),
      metadata: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
      url: z.string().optional().describe('Clicked URL'),
      deliveryStatus: z.string().optional().describe('Detailed delivery status'),
      destinationResponse: z.string().optional().describe('SMTP response'),
      userAgent: z.string().optional().describe('Recipient user agent'),
      ip: z.string().optional().describe('Recipient IP address'),
      userId: z.number().optional().describe('UniOne user ID'),
      projectId: z.string().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Job ID of the email'),
      recipientEmail: z.string().describe('Recipient email address'),
      status: z
        .string()
        .describe(
          'Email delivery status (delivered, opened, clicked, unsubscribed, subscribed, soft_bounced, hard_bounced, spam)'
        ),
      eventTime: z.string().describe('Timestamp of the event'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom metadata sent with the original email'),
      clickedUrl: z.string().optional().describe('URL that was clicked (for click events)'),
      deliveryStatus: z.string().optional().describe('Detailed delivery status code'),
      destinationResponse: z
        .string()
        .optional()
        .describe('SMTP response from the recipient server'),
      userAgent: z.string().optional().describe('Recipient user agent string'),
      recipientIp: z.string().optional().describe('Recipient IP address'),
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
          email_status: [
            'delivered',
            'opened',
            'clicked',
            'unsubscribed',
            'subscribed',
            'soft_bounced',
            'hard_bounced',
            'spam'
          ]
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
        jobId: string;
        recipientEmail: string;
        status: string;
        eventTime: string;
        metadata?: Record<string, string>;
        url?: string;
        deliveryStatus?: string;
        destinationResponse?: string;
        userAgent?: string;
        ip?: string;
        userId?: number;
        projectId?: string;
        projectName?: string;
      }> = [];

      let eventsByUser = body.events_by_user ?? [];

      for (let userGroup of eventsByUser) {
        let events = userGroup.events ?? [];
        for (let event of events) {
          if (event.event_name !== 'transactional_email_status') continue;

          let eventData = event.event_data ?? {};
          let deliveryInfo = eventData.delivery_info ?? {};

          inputs.push({
            eventName: event.event_name,
            eventId: `${eventData.job_id}-${eventData.email}-${eventData.status}-${eventData.event_time}`,
            jobId: eventData.job_id ?? '',
            recipientEmail: eventData.email ?? '',
            status: eventData.status ?? '',
            eventTime: eventData.event_time ?? '',
            metadata: eventData.metadata,
            url: eventData.url,
            deliveryStatus: deliveryInfo.delivery_status,
            destinationResponse: deliveryInfo.destination_response,
            userAgent: deliveryInfo.user_agent,
            ip: deliveryInfo.ip,
            userId: userGroup.user_id,
            projectId: userGroup.project_id,
            projectName: userGroup.project_name
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: `email.${ctx.input.status}`,
        id: ctx.input.eventId,
        output: {
          jobId: ctx.input.jobId,
          recipientEmail: ctx.input.recipientEmail,
          status: ctx.input.status,
          eventTime: ctx.input.eventTime,
          metadata: ctx.input.metadata,
          clickedUrl: ctx.input.url,
          deliveryStatus: ctx.input.deliveryStatus,
          destinationResponse: ctx.input.destinationResponse,
          userAgent: ctx.input.userAgent,
          recipientIp: ctx.input.ip,
          userId: ctx.input.userId,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName
        }
      };
    }
  })
  .build();

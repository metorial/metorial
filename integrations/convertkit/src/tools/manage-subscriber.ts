import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSubscriber = SlateTool.create(spec, {
  name: 'Manage Subscriber',
  key: 'manage_subscriber',
  description: `Create, update, get, unsubscribe, list tags for, or retrieve engagement stats for a subscriber. Use this to add new subscribers, update existing subscriber info (name, email, custom fields), look up subscriber details by ID, inspect tags/stats, or unsubscribe a subscriber.`,
  instructions: [
    'To create a new subscriber, set action to "create" and provide emailAddress.',
    'To update, set action to "update" and provide subscriberId plus the fields to change.',
    'To unsubscribe, set action to "unsubscribe" and provide subscriberId.',
    'To look up a subscriber, set action to "get" and provide subscriberId.',
    'To list tags for a subscriber, set action to "list_tags" and provide subscriberId.',
    'To retrieve engagement stats, set action to "get_stats" and provide subscriberId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'unsubscribe', 'list_tags', 'get_stats'])
        .describe('Action to perform on the subscriber'),
      subscriberId: z
        .number()
        .optional()
        .describe('Subscriber ID (required for update, get, unsubscribe)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Email address (required for create, optional for update)'),
      firstName: z.string().optional().describe('First name'),
      state: z
        .enum(['active', 'inactive'])
        .optional()
        .describe('Initial state (only for create)'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs'),
      emailSentAfter: z
        .string()
        .optional()
        .describe('For get_stats, include stats for emails sent after this YYYY-MM-DD date'),
      emailSentBefore: z
        .string()
        .optional()
        .describe('For get_stats, include stats for emails sent before this YYYY-MM-DD date')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().optional().describe('Subscriber ID'),
      firstName: z.string().nullable().optional().describe('First name'),
      emailAddress: z.string().optional().describe('Email address'),
      state: z.string().optional().describe('Subscriber state'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      fields: z
        .record(z.string(), z.string().nullable())
        .optional()
        .describe('Custom field values'),
      unsubscribed: z.boolean().optional().describe('Whether the subscriber was unsubscribed'),
      tags: z
        .array(
          z.object({
            tagId: z.number(),
            tagName: z.string(),
            createdAt: z.string()
          })
        )
        .optional()
        .describe('Tags currently assigned to the subscriber'),
      stats: z
        .object({
          sent: z.number(),
          opened: z.number(),
          clicked: z.number(),
          bounced: z.number(),
          openRate: z.number(),
          clickRate: z.number(),
          lastSent: z.string().nullable(),
          lastOpened: z.string().nullable(),
          lastClicked: z.string().nullable(),
          sendsSinceLastOpen: z.number(),
          sendsSinceLastClick: z.number()
        })
        .optional()
        .describe('Subscriber email engagement stats')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let input = ctx.input;

    if (input.action === 'unsubscribe') {
      if (!input.subscriberId)
        throw kitServiceError('subscriberId is required for unsubscribe');
      await client.unsubscribeSubscriber(input.subscriberId);
      return {
        output: {
          subscriberId: input.subscriberId,
          unsubscribed: true
        },
        message: `Subscriber **#${input.subscriberId}** has been unsubscribed.`
      };
    }

    if (input.action === 'get') {
      if (!input.subscriberId) throw kitServiceError('subscriberId is required for get');
      let sub = await client.getSubscriber(input.subscriberId);
      return {
        output: {
          subscriberId: sub.id,
          firstName: sub.first_name,
          emailAddress: sub.email_address,
          state: sub.state,
          createdAt: sub.created_at,
          fields: sub.fields
        },
        message: `Subscriber **${sub.email_address}** (${sub.state})`
      };
    }

    if (input.action === 'create') {
      if (!input.emailAddress) throw kitServiceError('emailAddress is required for create');
      let sub = await client.createSubscriber({
        emailAddress: input.emailAddress,
        firstName: input.firstName,
        state: input.state,
        fields: input.customFields
      });
      return {
        output: {
          subscriberId: sub.id,
          firstName: sub.first_name,
          emailAddress: sub.email_address,
          state: sub.state,
          createdAt: sub.created_at,
          fields: sub.fields
        },
        message: `Created subscriber **${sub.email_address}** (#${sub.id})`
      };
    }

    if (input.action === 'update') {
      if (!input.subscriberId) throw kitServiceError('subscriberId is required for update');
      let sub = await client.updateSubscriber(input.subscriberId, {
        emailAddress: input.emailAddress,
        firstName: input.firstName,
        fields: input.customFields
      });
      return {
        output: {
          subscriberId: sub.id,
          firstName: sub.first_name,
          emailAddress: sub.email_address,
          state: sub.state,
          createdAt: sub.created_at,
          fields: sub.fields
        },
        message: `Updated subscriber **${sub.email_address}** (#${sub.id})`
      };
    }

    if (input.action === 'list_tags') {
      if (!input.subscriberId) throw kitServiceError('subscriberId is required for list_tags');
      let result = await client.getSubscriberTags(input.subscriberId);
      let tags = result.tags.map(tag => ({
        tagId: tag.id,
        tagName: tag.name,
        createdAt: tag.created_at
      }));
      return {
        output: {
          subscriberId: input.subscriberId,
          tags
        },
        message: `Found **${tags.length}** tag(s) for subscriber #${input.subscriberId}.`
      };
    }

    if (input.action === 'get_stats') {
      if (!input.subscriberId) throw kitServiceError('subscriberId is required for get_stats');
      let stats = await client.getSubscriberStats(input.subscriberId, {
        emailSentAfter: input.emailSentAfter,
        emailSentBefore: input.emailSentBefore
      });
      return {
        output: {
          subscriberId: input.subscriberId,
          stats: {
            sent: stats.sent,
            opened: stats.opened,
            clicked: stats.clicked,
            bounced: stats.bounced,
            openRate: stats.open_rate,
            clickRate: stats.click_rate,
            lastSent: stats.last_sent,
            lastOpened: stats.last_opened,
            lastClicked: stats.last_clicked,
            sendsSinceLastOpen: stats.sends_since_last_open,
            sendsSinceLastClick: stats.sends_since_last_click
          }
        },
        message: `Retrieved engagement stats for subscriber #${input.subscriberId}.`
      };
    }

    throw kitServiceError(`Unknown action: ${input.action}`);
  });

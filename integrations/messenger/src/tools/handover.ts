import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { messengerServiceError } from '../lib/errors';
import { spec } from '../spec';

export let handover = SlateTool.create(spec, {
  name: 'Manage Thread Handover',
  key: 'manage_thread_handover',
  description: `Control and inspect conversation thread ownership between apps using the Handover Protocol. **Pass** thread control to another app, **take** thread control back, **request** thread control from the current owner, get the current thread owner, or list secondary receiver apps.`,
  instructions: [
    'Use "pass" to hand off the conversation to another app by providing the targetAppId.',
    'Use "take" as the primary receiver to reclaim thread control.',
    'Use "request" as a secondary receiver to ask the primary app for control.',
    'Use "get_owner" to inspect which app currently owns a user thread.',
    'Use "list_secondary_receivers" to inspect configured secondary receiver apps for the Page.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientId: z
        .string()
        .optional()
        .describe('Page-Scoped User ID (PSID) of the user in the conversation'),
      action: z
        .enum(['pass', 'take', 'request', 'get_owner', 'list_secondary_receivers'])
        .describe('Handover action to perform'),
      targetAppId: z
        .string()
        .optional()
        .describe('App ID to pass thread control to (required for "pass" action)'),
      metadata: z
        .string()
        .optional()
        .describe('Custom metadata string to pass along with the handover action')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the handover action was successful'),
      recipientId: z.string().optional().describe('PSID used for thread-specific actions'),
      ownerAppId: z.string().optional().describe('App ID that currently owns the thread'),
      secondaryReceivers: z
        .array(
          z.object({
            id: z.string().describe('Secondary receiver app ID'),
            name: z.string().optional().describe('Secondary receiver app name')
          })
        )
        .optional()
        .describe('Configured secondary receiver apps for the Page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      pageId: ctx.config.pageId,
      apiVersion: ctx.config.apiVersion
    });

    let { input } = ctx;

    switch (input.action) {
      case 'pass': {
        if (!input.recipientId) {
          throw messengerServiceError('recipientId is required for pass action');
        }
        if (!input.targetAppId) {
          throw messengerServiceError('targetAppId is required for pass action');
        }
        await client.passThreadControl(input.recipientId, input.targetAppId, input.metadata);
        break;
      }

      case 'take': {
        if (!input.recipientId) {
          throw messengerServiceError('recipientId is required for take action');
        }
        await client.takeThreadControl(input.recipientId, input.metadata);
        break;
      }

      case 'request': {
        if (!input.recipientId) {
          throw messengerServiceError('recipientId is required for request action');
        }
        await client.requestThreadControl(input.recipientId, input.metadata);
        break;
      }

      case 'get_owner': {
        if (!input.recipientId) {
          throw messengerServiceError('recipientId is required for get_owner action');
        }
        let owner = await client.getThreadOwner(input.recipientId);
        return {
          output: {
            success: true,
            recipientId: input.recipientId,
            ownerAppId: owner.ownerAppId
          },
          message: owner.ownerAppId
            ? `Thread owner for user **${input.recipientId}** is app **${owner.ownerAppId}**.`
            : `Retrieved thread owner response for user **${input.recipientId}**.`
        };
      }

      case 'list_secondary_receivers': {
        let secondaryReceivers = await client.listSecondaryReceivers();
        return {
          output: {
            success: true,
            secondaryReceivers
          },
          message: `Retrieved **${secondaryReceivers.length}** secondary receiver app(s).`
        };
      }
    }

    let actionLabel = {
      pass: `Thread control passed to app **${input.targetAppId}**`,
      take: 'Thread control taken back',
      request: 'Thread control requested'
    }[input.action];

    return {
      output: {
        success: true,
        recipientId: input.recipientId
      },
      message: `${actionLabel} for user **${input.recipientId}**.`
    };
  })
  .build();

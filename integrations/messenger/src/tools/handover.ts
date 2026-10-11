import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createMessengerClient } from '../lib/client';
import { messengerServiceError } from '../lib/errors';
import { spec } from '../spec';

export let handover = SlateTool.create(spec, {
  name: 'Manage Thread Handover',
  key: 'manage_thread_handover',
  description: `Control and inspect which app owns a Messenger conversation (Conversation Routing). **Pass** thread control to another app, **take** thread control, **request** control from the current owner, **release** control back to idle, **extend** the control period, get the current thread owner, or list secondary receiver apps.`,
  instructions: [
    'Use "pass" to hand off the conversation to another app by providing the targetAppId (263902037430900 is the Page Inbox).',
    'Use "take" to take thread control when the thread is idle or your app may take control.',
    'Use "request" to ask the current owner app for control.',
    'Use "release" when your app has finished, so the conversation returns to idle for the default app.',
    'Use "extend" with durationSeconds to keep control longer than 24 hours (up to 7 days).',
    'Use "get_owner" to inspect which app currently owns a user thread.',
    'Use "list_secondary_receivers" to inspect secondary receiver apps from the legacy handover setup.'
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
        .enum([
          'pass',
          'take',
          'request',
          'get_owner',
          'list_secondary_receivers',
          'release',
          'extend'
        ])
        .describe('Handover action to perform'),
      targetAppId: z
        .string()
        .optional()
        .describe('App ID to pass thread control to (required for "pass" action)'),
      metadata: z
        .string()
        .max(1000)
        .optional()
        .describe(
          'Custom metadata string to pass along with the pass, take, request, or release action'
        ),
      durationSeconds: z
        .number()
        .int()
        .positive()
        .max(604800)
        .optional()
        .describe(
          'How long to extend thread control, in seconds (up to 604800, 7 days). Required for "extend".'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the handover action was successful'),
      recipientId: z.string().optional().describe('PSID used for thread-specific actions'),
      ownerAppId: z.string().optional().describe('App ID that currently owns the thread'),
      expiration: z
        .number()
        .optional()
        .describe('Unix timestamp (seconds) when the current thread control expires'),
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
    let client = createMessengerClient(ctx);

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

      case 'release': {
        if (!input.recipientId) {
          throw messengerServiceError('recipientId is required for release action');
        }
        await client.releaseThreadControl(input.recipientId, input.metadata);
        break;
      }

      case 'extend': {
        if (!input.recipientId) {
          throw messengerServiceError('recipientId is required for extend action');
        }
        if (!input.durationSeconds) {
          throw messengerServiceError('durationSeconds is required for extend action');
        }
        await client.extendThreadControl(input.recipientId, input.durationSeconds);
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
            ownerAppId: owner.ownerAppId,
            expiration: owner.expiration
          },
          message: owner.ownerAppId
            ? `Thread owner for user **${input.recipientId}** is app **${owner.ownerAppId}**.`
            : `No app reported as thread owner for user **${input.recipientId}** (the thread may be idle, or your app is not the owner or default app).`
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
      take: 'Thread control taken',
      request: 'Thread control requested',
      release: 'Thread control released',
      extend: `Thread control extended by ${input.durationSeconds} seconds`
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

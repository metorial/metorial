import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

let userEventTypes = [
  'user_created',
  'user_updated',
  'user_deleted',
  'user_archived',
  'user_restored',
  'user_promoted',
  'user_demoted'
] as const;

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when users are created, updated, deleted, archived, restored, promoted, or demoted in Connecteam.'
})
  .input(
    z.object({
      eventType: z.enum(userEventTypes).describe('Type of user event'),
      eventTimestamp: z.number().describe('Unix timestamp of the event'),
      requestId: z.string().describe('Unique request ID from the webhook'),
      company: z.string().optional().describe('Company identifier'),
      userData: z.any().describe('User data from the webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      phoneNumber: z.string().optional().describe('Phone number'),
      email: z.string().optional().describe('Email address'),
      userType: z.string().optional().describe('User role'),
      isArchived: z.boolean().optional().describe('Whether user is archived'),
      createdAt: z.number().optional().describe('Unix timestamp of creation'),
      modifiedAt: z.number().optional().describe('Unix timestamp of last modification'),
      customFields: z.array(z.any()).optional().describe('Custom field values'),
      smartGroupsIds: z.array(z.number()).optional().describe('Smart group IDs')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ConnecteamClient({
        baseUrl: ctx.config.baseUrl,
        token: ctx.auth.token
      });

      let result = await client.createWebhook({
        name: 'Slates User Events',
        url: ctx.input.webhookBaseUrl,
        featureType: 'users',
        eventTypes: [...userEventTypes]
      });

      return {
        registrationDetails: {
          webhookId: result.data?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ConnecteamClient({
        baseUrl: ctx.config.baseUrl,
        token: ctx.auth.token
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.eventType as string;
      let data = body.data;

      // For user_created and user_updated, data is an array of user objects
      // For other events, data contains just {id: number}
      let isFullUserData = eventType === 'user_created' || eventType === 'user_updated';

      if (isFullUserData && Array.isArray(data)) {
        return {
          inputs: data.map((user: any) => ({
            eventType: eventType as (typeof userEventTypes)[number],
            eventTimestamp: body.eventTimestamp ?? Math.floor(Date.now() / 1000),
            requestId: body.requestId ?? `${eventType}_${user.userId}_${Date.now()}`,
            company: body.company,
            userData: user
          }))
        };
      }

      return {
        inputs: [
          {
            eventType: eventType as (typeof userEventTypes)[number],
            eventTimestamp: body.eventTimestamp ?? Math.floor(Date.now() / 1000),
            requestId: body.requestId ?? `${eventType}_${Date.now()}`,
            company: body.company,
            userData: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, requestId, userData } = ctx.input;

      let userId = userData?.userId ?? userData?.id ?? 0;

      return {
        type: `user.${eventType.replace('user_', '')}`,
        id: `${requestId}_${userId}`,
        output: {
          userId,
          firstName: userData?.firstName,
          lastName: userData?.lastName,
          phoneNumber: userData?.phoneNumber,
          email: userData?.email,
          userType: userData?.userType,
          isArchived: userData?.isArchived,
          createdAt: userData?.createdAt,
          modifiedAt: userData?.modifiedAt,
          customFields: userData?.customFields,
          smartGroupsIds: userData?.smartGroupsIds
        }
      };
    }
  })
  .build();

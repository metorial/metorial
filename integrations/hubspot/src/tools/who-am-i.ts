import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotServiceError } from '../lib/errors';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: 'Identify the HubSpot user and account connected to this integration.',
  instructions: ['Use this when the connected HubSpot user or account is unknown.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      user: z
        .string()
        .optional()
        .describe('Email address of the authenticated HubSpot OAuth user'),
      userId: z
        .string()
        .optional()
        .describe('HubSpot user ID associated with the OAuth connection'),
      hubId: z.string().describe('HubSpot account ID, also known as the portal ID'),
      hubDomain: z
        .string()
        .optional()
        .describe('HubSpot account domain associated with the OAuth connection')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let accountDetails = await client.getAccountDetails();
    let hubId =
      accountDetails.portalId == null ? ctx.auth.hubId : String(accountDetails.portalId);

    if (!hubId) {
      throw hubSpotServiceError(
        'HubSpot did not return an account ID for the authenticated connection.'
      );
    }

    return {
      output: {
        ...(ctx.auth.user ? { user: ctx.auth.user } : {}),
        ...(ctx.auth.userId ? { userId: ctx.auth.userId } : {}),
        hubId,
        ...(ctx.auth.hubDomain ? { hubDomain: ctx.auth.hubDomain } : {})
      },
      message: `Connected to HubSpot account **${hubId}**${ctx.auth.user ? ` as **${ctx.auth.user}**` : ''}`
    };
  })
  .build();

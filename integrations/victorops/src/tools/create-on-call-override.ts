import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOnCallOverride = SlateTool.create(spec, {
  name: 'Create On-Call Override',
  key: 'create_on_call_override',
  description: `Take on-call from another user within an escalation policy. This creates an immediate on-call override, temporarily replacing the currently on-call user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      policySlug: z.string().describe('Slug of the escalation policy to override on-call for'),
      fromUser: z.string().describe('Username of the user currently on-call'),
      toUser: z.string().describe('Username of the user taking over on-call')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Override result details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let result = await client.createOnCallOverride(ctx.input.policySlug, {
      fromUser: ctx.input.fromUser,
      toUser: ctx.input.toUser
    });

    return {
      output: { result },
      message: `On-call override created: **${ctx.input.toUser}** is now on-call in place of **${ctx.input.fromUser}** for policy **${ctx.input.policySlug}**.`
    };
  })
  .build();

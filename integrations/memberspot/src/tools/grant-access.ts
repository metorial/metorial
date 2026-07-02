import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let grantAccessTool = SlateTool.create(spec, {
  name: 'Grant Course Access',
  key: 'grant_access',
  description: `Grant a user access to a course/offer. If the member does not already exist, a new member account will be created automatically with the provided name and email. Use this to enroll users after purchases or sign-ups.`,
  instructions: [
    'Provide the offer ID (not the course name) and a unique order ID for tracking.'
  ]
})
  .input(
    z.object({
      firstname: z.string().describe('First name of the user'),
      lastname: z.string().describe('Last name of the user'),
      email: z.string().describe('Email address of the user'),
      offerId: z.string().describe('ID of the offer/course to grant access to'),
      orderId: z
        .string()
        .describe('Unique order ID for this access grant, used to track and manage access')
    })
  )
  .output(
    z.object({
      result: z.record(z.string(), z.any()).describe('Access grant result from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.grantAccess({
      firstname: ctx.input.firstname,
      lastname: ctx.input.lastname,
      email: ctx.input.email,
      offerId: ctx.input.offerId,
      orderId: ctx.input.orderId
    });

    return {
      output: { result },
      message: `Granted access to offer **${ctx.input.offerId}** for **${ctx.input.email}** (order: ${ctx.input.orderId}).`
    };
  })
  .build();

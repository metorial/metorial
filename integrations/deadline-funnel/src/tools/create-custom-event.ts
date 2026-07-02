import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeadlineFunnelClient } from '../lib/client';
import { spec } from '../spec';

export let createCustomEvent = SlateTool.create(spec, {
  name: 'Create Custom Event',
  key: 'create_custom_event',
  description: `Create a custom event in Deadline Funnel for a contact. Custom events can be used for social proof displays in ConvertHub's Portal widget and for analytics tracking.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      eventName: z.string().describe('Name of the custom event to create'),
      email: z.string().describe('Email address of the contact associated with the event'),
      contactName: z.string().optional().describe('Name of the contact')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the custom event was successfully created'),
      eventName: z.string().describe('Name of the custom event that was created'),
      email: z.string().describe('Email address of the associated contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeadlineFunnelClient({ token: ctx.auth.token });
    let result = await client.createCustomEvent({
      eventName: ctx.input.eventName,
      email: ctx.input.email,
      name: ctx.input.contactName
    });

    return {
      output: result,
      message: `Custom event **${ctx.input.eventName}** created for **${ctx.input.email}**.`
    };
  })
  .build();

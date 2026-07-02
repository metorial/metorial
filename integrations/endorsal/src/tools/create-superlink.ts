import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createSuperLink = SlateTool.create(spec, {
  name: 'Create SuperLink',
  key: 'create_superlink',
  description: `Generate a pre-filled review form URL (SuperLink) for a customer. SuperLinks reduce friction by pre-populating the review form with customer data you already have, increasing the likelihood of receiving a testimonial. The generated URL can be shared via email, SMS, or any other communication channel.`
})
  .input(
    z.object({
      propertyId: z.string().describe('The Endorsal property ID'),
      name: z.string().optional().describe('Customer name to pre-fill in the review form'),
      email: z.string().optional().describe('Customer email to pre-fill'),
      company: z.string().optional().describe('Customer company to pre-fill'),
      position: z.string().optional().describe('Customer job title to pre-fill'),
      location: z.string().optional().describe('Customer location to pre-fill')
    })
  )
  .output(
    z.object({
      superLinkUrl: z
        .string()
        .describe('The generated SuperLink URL to share with the customer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSuperLink({
      propertyID: ctx.input.propertyId,
      name: ctx.input.name,
      email: ctx.input.email,
      company: ctx.input.company,
      position: ctx.input.position,
      location: ctx.input.location
    });

    return {
      output: {
        superLinkUrl: result.url
      },
      message: `Created SuperLink${ctx.input.name ? ` for **${ctx.input.name}**` : ''}: ${result.url}`
    };
  })
  .build();

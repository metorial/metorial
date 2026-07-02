import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let createSession = SlateTool.create(spec, {
  name: 'Create Session',
  key: 'create_session',
  description: `Create a new session (contact/user) in Gleap. Sessions store user identity information and custom data attributes. If a session with the same userId already exists, the existing session may be reused.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Unique user identifier for the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      name: z.string().optional().describe('Full name of the contact'),
      phone: z.string().optional().describe('Phone number'),
      companyId: z.string().optional().describe('Company identifier'),
      companyName: z.string().optional().describe('Company name'),
      plan: z.string().optional().describe('Subscription plan'),
      value: z.number().optional().describe('Customer value'),
      customData: z.record(z.string(), z.any()).optional().describe('Custom data attributes'),
      tags: z.array(z.string()).optional().describe('Tags to apply'),
      lang: z.string().optional().describe('Language code (e.g. en, de)')
    })
  )
  .output(
    z.object({
      session: z.record(z.string(), z.any()).describe('The created session object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let session = await client.createSession(ctx.input);

    return {
      output: { session },
      message: `Created session for **${ctx.input.name || ctx.input.email || ctx.input.userId || 'contact'}**.`
    };
  })
  .build();

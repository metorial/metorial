import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { memberSchema } from '../lib/types';
import { spec } from '../spec';

export let createMember = SlateTool.create(spec, {
  name: 'Create Member',
  key: 'create_member',
  description: `Create a new member in your Memberstack app. Requires an email and password. Optionally assign free plans, set custom fields, metadata, and JSON data during creation.`,
  constraints: [
    'Only free plans can be assigned during creation via the Admin API.',
    'Sandbox keys are limited to 50 test members.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new member'),
      password: z.string().describe('Password for the new member'),
      planIds: z
        .array(z.string())
        .optional()
        .describe('Array of free plan IDs to assign to the member on creation'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields key-value pairs to set on the member'),
      metaData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata key-value pairs to set on the member'),
      json: z.any().optional().describe('Arbitrary JSON data to store on the member'),
      loginRedirect: z
        .string()
        .optional()
        .describe('URL to redirect the member to after login')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let plans = ctx.input.planIds?.map(planId => ({ planId }));

    let member = await client.createMember({
      email: ctx.input.email,
      password: ctx.input.password,
      plans,
      customFields: ctx.input.customFields,
      metaData: ctx.input.metaData,
      json: ctx.input.json,
      loginRedirect: ctx.input.loginRedirect
    });

    return {
      output: member,
      message: `Created member **${member.auth.email}** (${member.memberId})`
    };
  })
  .build();

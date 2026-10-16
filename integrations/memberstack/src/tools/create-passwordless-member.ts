import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { memberSchema } from '../lib/types';
import { spec } from '../spec';

export let createPasswordlessMember = SlateTool.create(spec, {
  name: 'Create Passwordless Member',
  key: 'create_passwordless_member',
  description:
    'Create a member without a password in an app with email/OTP authentication enabled. Optionally assign free plans and member data.',
  constraints: [
    'Passwordless authentication must be enabled in the Memberstack app. This creates the member; it does not send an OTP email.',
    'Only free plans can be assigned. Sandbox keys support up to 50 test members.'
  ]
})
  .input(
    z.object({
      email: z.string().describe('Unique member email address'),
      planIds: z
        .array(z.string())
        .optional()
        .describe('Free plan IDs from the Memberstack dashboard'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values'),
      metaData: z.record(z.string(), z.unknown()).optional().describe('Member metadata'),
      json: z.unknown().optional().describe('Member JSON data'),
      loginRedirect: z.string().optional().describe('Redirect URL after login')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let member = await new Client({ token: ctx.auth.token }).createMember({
      email: ctx.input.email,
      plans: ctx.input.planIds?.map(planId => ({ planId })),
      customFields: ctx.input.customFields,
      metaData: ctx.input.metaData,
      json: ctx.input.json,
      loginRedirect: ctx.input.loginRedirect
    });
    return {
      output: member,
      message: `Created member **${member.auth.email}** (${member.memberId}).`
    };
  })
  .build();

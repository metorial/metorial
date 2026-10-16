import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { memberSchema } from '../lib/types';
import { spec } from '../spec';

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update an existing member's email, verification status, profile image, custom fields, metadata, JSON data, or login redirect. Only provided fields are changed.`,
  instructions: [
    'customFields and metaData are shallow-merged: supplied keys are added or overwritten and omitted keys remain. Metadata keys with falsy values are removed by Memberstack.',
    'json replaces the existing JSON value entirely. Retrieve the member first when preserving other JSON keys.',
    'The legacy password input is forwarded for compatibility. Current Admin API documentation does not describe password updates, so a successful member response does not verify that the password changed. Use the member-facing password reset flow when a confirmed password change is needed.'
  ]
})
  .input(
    z.object({
      memberId: z.string().describe('The member ID (e.g. mem_abc123) to update'),
      email: z.string().optional().describe('New email address for the member'),
      password: z
        .string()
        .optional()
        .describe(
          'Legacy password input forwarded to Memberstack. Password-update semantics are unverified; a successful member response does not confirm a password change.'
        ),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields to shallow-merge with existing custom fields'),
      metaData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata to shallow-merge. Falsy metadata values remove their keys.'),
      json: z.any().optional().describe('JSON data to set (replaces existing JSON data)'),
      loginRedirect: z.string().optional().describe('New login redirect URL'),
      verified: z
        .boolean()
        .optional()
        .describe('Set the email-verified status; false is forwarded unchanged.'),
      profileImage: z.string().optional().describe('New profile image URL')
    })
  )
  .output(memberSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let member = await client.updateMember(ctx.input.memberId, {
      email: ctx.input.email,
      password: ctx.input.password,
      customFields: ctx.input.customFields,
      metaData: ctx.input.metaData,
      json: ctx.input.json,
      loginRedirect: ctx.input.loginRedirect,
      verified: ctx.input.verified,
      profileImage: ctx.input.profileImage
    });

    return {
      output: member,
      message:
        ctx.input.password === undefined
          ? `Updated member **${member.auth.email}** (${member.memberId})`
          : `Submitted member update for **${member.auth.email}** (${member.memberId}). This response does not verify whether the password changed.`
    };
  })
  .build();

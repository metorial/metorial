import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { memberSchema } from '../lib/types';
import { spec } from '../spec';

export let updateMember = SlateTool.create(spec, {
  name: 'Update Member',
  key: 'update_member',
  description: `Update an existing member's details. Can modify email, password, custom fields, metadata, JSON data, and login redirect URL. All update fields are optional — only provided fields will be changed.`,
  instructions: [
    'When updating customFields, metaData, or json, the provided object replaces the existing value entirely. To update specific keys, first retrieve the current member data, modify the desired keys, then send the full updated object.'
  ]
})
  .input(
    z.object({
      memberId: z.string().describe('The member ID (e.g. mem_abc123) to update'),
      email: z.string().optional().describe('New email address for the member'),
      password: z.string().optional().describe('New password for the member'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields to set (replaces existing custom fields)'),
      metaData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metadata to set (replaces existing metadata)'),
      json: z.any().optional().describe('JSON data to set (replaces existing JSON data)'),
      loginRedirect: z.string().optional().describe('New login redirect URL')
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
      loginRedirect: ctx.input.loginRedirect
    });

    return {
      output: member,
      message: `Updated member **${member.auth.email}** (${member.memberId})`
    };
  })
  .build();

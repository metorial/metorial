import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Delete a person and all their associated data from Delighted. This permanently removes surveys, responses, properties, Autopilot membership, and all other linked data. Identify the person by ID, email, or phone number.`,
  constraints: [
    'This action is irreversible. All associated data will be permanently deleted.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.string().optional().describe('Delete person by their unique ID'),
      email: z.string().optional().describe('Delete person by email address'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Delete person by phone number in E.164 format')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the deletion was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let identifier: string;
    if (ctx.input.personId) {
      identifier = ctx.input.personId;
    } else if (ctx.input.email) {
      identifier = `email:${ctx.input.email}`;
    } else if (ctx.input.phoneNumber) {
      identifier = `phone_number:${ctx.input.phoneNumber}`;
    } else {
      throw new Error(
        'Provide one of personId, email, or phoneNumber to identify the person to delete.'
      );
    }

    let result = await client.deletePerson(identifier);

    return {
      output: { ok: result.ok },
      message: `Person **${ctx.input.email || ctx.input.phoneNumber || ctx.input.personId}** and all associated data deleted.`
    };
  })
  .build();

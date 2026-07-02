import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateConstituent = SlateTool.create(spec, {
  name: 'Update Constituent',
  key: 'update_constituent',
  description: `Update an existing constituent record. Only provided fields are updated; omitted fields remain unchanged. Can also add new addresses, emails, phones, and notes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      constituentId: z.string().describe('System record ID of the constituent to update.'),
      firstName: z.string().optional().describe('Updated first name.'),
      lastName: z.string().optional().describe('Updated last name.'),
      title: z.string().optional().describe('Updated title.'),
      suffix: z.string().optional().describe('Updated suffix.'),
      gender: z.string().optional().describe('Updated gender.'),
      birthdate: z.string().optional().describe('Updated birth date (YYYY-MM-DD).'),
      newAddress: z
        .object({
          type: z.string().describe('Address type.'),
          address_lines: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postal_code: z.string().optional(),
          country: z.string().optional(),
          preferred: z.boolean().optional()
        })
        .optional()
        .describe('New address to add to the constituent.'),
      newEmail: z
        .object({
          type: z.string().describe('Email type.'),
          address: z.string().describe('Email address.'),
          primary: z.boolean().optional()
        })
        .optional()
        .describe('New email address to add.'),
      newPhone: z
        .object({
          type: z.string().describe('Phone type.'),
          number: z.string().describe('Phone number.'),
          primary: z.boolean().optional()
        })
        .optional()
        .describe('New phone number to add.'),
      newNote: z
        .object({
          type: z.string().describe('Note type.'),
          summary: z.string().optional().describe('Note summary.'),
          text: z.string().optional().describe('Note body text.')
        })
        .optional()
        .describe('New note to add.')
    })
  )
  .output(
    z.object({
      constituentId: z.string().describe('System record ID of the updated constituent.'),
      updated: z.boolean().describe('Whether the constituent was updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let updateData: Record<string, any> = {};
    if (ctx.input.firstName) updateData.first = ctx.input.firstName;
    if (ctx.input.lastName) updateData.last = ctx.input.lastName;
    if (ctx.input.title) updateData.title = ctx.input.title;
    if (ctx.input.suffix) updateData.suffix = ctx.input.suffix;
    if (ctx.input.gender) updateData.gender = ctx.input.gender;
    if (ctx.input.birthdate) {
      let parts = ctx.input.birthdate.split('-');
      updateData.birthdate = {
        y: Number.parseInt(parts[0] ?? '0', 10),
        m: Number.parseInt(parts[1] ?? '0', 10),
        d: Number.parseInt(parts[2] ?? '0', 10)
      };
    }

    let hasUpdates = Object.keys(updateData).length > 0;
    if (hasUpdates) {
      await client.updateConstituent(ctx.input.constituentId, updateData);
    }

    if (ctx.input.newAddress) {
      await client.createConstituentAddress(ctx.input.constituentId, ctx.input.newAddress);
    }
    if (ctx.input.newEmail) {
      await client.createConstituentEmailAddress(ctx.input.constituentId, ctx.input.newEmail);
    }
    if (ctx.input.newPhone) {
      await client.createConstituentPhone(ctx.input.constituentId, ctx.input.newPhone);
    }
    if (ctx.input.newNote) {
      await client.createConstituentNote(ctx.input.constituentId, ctx.input.newNote);
    }

    return {
      output: {
        constituentId: ctx.input.constituentId,
        updated: true
      },
      message: `Updated constituent **${ctx.input.constituentId}**.`
    };
  })
  .build();

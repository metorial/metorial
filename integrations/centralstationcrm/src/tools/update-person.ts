import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing person's details in CentralStationCRM. You can modify any combination of fields including name, title, gender, background, and the responsible user.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name (surname)'),
      title: z.string().optional().describe('Updated title (e.g., Dr., Prof.)'),
      salutation: z.string().optional().describe('Updated salutation'),
      gender: z
        .enum([
          'gender_unknown',
          'gender_male',
          'gender_female',
          'gender_family',
          'gender_diverse'
        ])
        .optional()
        .describe('Updated gender'),
      background: z.string().optional().describe('Updated background information'),
      responsibleUserId: z.number().optional().describe('ID of the new responsible user')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the updated person'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let data: Record<string, unknown> = {};
    if (ctx.input.firstName !== undefined) data.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) data.name = ctx.input.lastName;
    if (ctx.input.title !== undefined) data.title = ctx.input.title;
    if (ctx.input.salutation !== undefined) data.salutation = ctx.input.salutation;
    if (ctx.input.gender !== undefined) data.gender = ctx.input.gender;
    if (ctx.input.background !== undefined) data.background = ctx.input.background;
    if (ctx.input.responsibleUserId !== undefined) data.user_id = ctx.input.responsibleUserId;

    let result = await client.updatePerson(ctx.input.personId, data);
    let person = result?.person ?? result;

    return {
      output: {
        personId: person.id,
        firstName: person.first_name,
        lastName: person.name,
        updatedAt: person.updated_at
      },
      message: `Updated person **${[person.first_name, person.name].filter(Boolean).join(' ')}** (ID: ${person.id}).`
    };
  })
  .build();

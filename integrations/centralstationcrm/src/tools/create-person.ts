import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new person (contact) in CentralStationCRM. Optionally assign the person to a responsible user and set profile details like gender, title, and background information.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      firstName: z.string().optional().describe('First name of the person'),
      lastName: z.string().describe('Last name (surname) of the person'),
      title: z.string().optional().describe('Title of the person (e.g., Dr., Prof.)'),
      salutation: z.string().optional().describe('Salutation for the person'),
      gender: z
        .enum([
          'gender_unknown',
          'gender_male',
          'gender_female',
          'gender_family',
          'gender_diverse'
        ])
        .optional()
        .describe('Gender of the person'),
      background: z
        .string()
        .optional()
        .describe('Background information, notes about hobbies, interests, etc.'),
      responsibleUserId: z
        .number()
        .optional()
        .describe('ID of the user responsible for this person')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the created person'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.createPerson({
      first_name: ctx.input.firstName,
      name: ctx.input.lastName,
      title: ctx.input.title,
      salutation: ctx.input.salutation,
      gender: ctx.input.gender,
      background: ctx.input.background,
      user_id: ctx.input.responsibleUserId
    });

    let person = result?.person ?? result;

    return {
      output: {
        personId: person.id,
        firstName: person.first_name,
        lastName: person.name,
        createdAt: person.created_at
      },
      message: `Created person **${[ctx.input.firstName, ctx.input.lastName].filter(Boolean).join(' ')}** (ID: ${person.id}).`
    };
  })
  .build();

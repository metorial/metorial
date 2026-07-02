import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let personSchema = z.object({
  personId: z.number().describe('Unique identifier of the person'),
  name: z.string().describe('Full name of the person'),
  emailAddress: z.string().nullable().describe('Email address'),
  title: z.string().nullable().describe('Job title'),
  company: z.string().nullable().describe('Company name'),
  admin: z.boolean().describe('Whether the person is an admin'),
  avatarUrl: z.string().nullable().describe('URL to the person avatar image')
});

export let listPeopleTool = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `List all people visible to the current user in the Basecamp account, or list people assigned to a specific project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Optionally filter to people on a specific project')
    })
  )
  .output(
    z.object({
      people: z.array(personSchema).describe('List of people')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let people = ctx.input.projectId
      ? await client.listProjectPeople(ctx.input.projectId)
      : await client.listPeople();

    let mapped = people.map((p: any) => ({
      personId: p.id,
      name: p.name,
      emailAddress: p.email_address ?? null,
      title: p.title ?? null,
      company: p.company?.name ?? null,
      admin: p.admin ?? false,
      avatarUrl: p.avatar_url ?? null
    }));

    return {
      output: { people: mapped },
      message: `Found **${mapped.length}** person(s).`
    };
  })
  .build();

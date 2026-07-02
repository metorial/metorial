import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve a person's full profile from CentralStationCRM by their ID. Use the **includes** parameter to also fetch related companies, tags, contact details, and more in a single request.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to retrieve'),
      includes: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of related data to include (e.g., "companies,tags,contact_details,addrs")'
        )
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the person'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Title'),
      gender: z.string().optional().describe('Gender'),
      background: z.string().optional().describe('Background information'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      rawData: z
        .any()
        .optional()
        .describe('Complete raw person data from API including any requested includes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.getPerson(ctx.input.personId, {
      includes: ctx.input.includes
    });

    let person = result?.person ?? result;

    return {
      output: {
        personId: person.id,
        firstName: person.first_name,
        lastName: person.name,
        title: person.title,
        gender: person.gender,
        background: person.background,
        createdAt: person.created_at,
        updatedAt: person.updated_at,
        rawData: result
      },
      message: `Retrieved person **${[person.first_name, person.name].filter(Boolean).join(' ')}** (ID: ${person.id}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let registrationSchema = z.object({
  registrationId: z.number().describe('Unique identifier for the registration'),
  email: z.string().describe('Email address of the registrant'),
  firstName: z.string().describe('First name of the registrant'),
  lastName: z.string().describe('Last name of the registrant'),
  createdAt: z.string().describe('When the registration was created (ISO 8601)')
});

export let listRegistrations = SlateTool.create(spec, {
  name: 'List Registrations',
  key: 'list_registrations',
  description: `Retrieves all registrations for the event.
Use this to see who has registered to attend the event.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      registrations: z.array(registrationSchema).describe('List of event registrations'),
      totalCount: z.number().describe('Total number of registrations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let registrations = await client.listRegistrations();

    return {
      output: {
        registrations,
        totalCount: registrations.length
      },
      message: `Retrieved **${registrations.length}** registration(s) for the event.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new contact profile in the Crisp CRM. At minimum, provide an email or nickname. Returns the new people ID.`
})
  .input(
    z.object({
      email: z.string().optional().describe('Contact email address'),
      nickname: z.string().optional().describe('Contact display name')
    })
  )
  .output(
    z.object({
      peopleId: z.string().describe('People profile ID of the newly created contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });

    let body: any = {};
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.nickname) body.person = { nickname: ctx.input.nickname };

    let result = await client.createPeopleProfile(body);

    return {
      output: {
        peopleId: result.people_id
      },
      message: `Created new contact **${ctx.input.nickname || ctx.input.email || result.people_id}**.`
    };
  })
  .build();

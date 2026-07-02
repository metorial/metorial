import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribePerson = SlateTool.create(spec, {
  name: 'Unsubscribe Person',
  key: 'unsubscribe_person',
  description: `Unsubscribe a person from future Delighted surveys. Equivalent to the person clicking "Unsubscribe" in a survey email. Does not delete historical survey responses.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the person to unsubscribe')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the unsubscribe was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.unsubscribePerson(ctx.input.email);

    return {
      output: { ok: result.ok },
      message: `**${ctx.input.email}** unsubscribed from future surveys.`
    };
  })
  .build();

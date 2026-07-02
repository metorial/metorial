import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new person record in the church database. Requires first and last name, and optionally accepts custom profile field values. Use **List Profile Fields** to discover available custom fields and their IDs before setting field values.`,
  instructions: [
    'Use the List Profile Fields tool first to discover the field IDs and types available for your account.',
    'Custom field values are passed as a JSON object mapping field IDs to values.'
  ]
})
  .input(
    z.object({
      firstName: z.string().describe('First name of the person'),
      lastName: z.string().describe('Last name of the person'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom profile field values as a map of field ID to value. Use List Profile Fields to discover available field IDs.'
        )
    })
  )
  .output(
    z.object({
      person: z.any().describe('The newly created person record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let fieldsJson = ctx.input.fields ? JSON.stringify(ctx.input.fields) : undefined;

    let person = await client.addPerson(ctx.input.firstName, ctx.input.lastName, fieldsJson);

    return {
      output: { person },
      message: `Created person **${ctx.input.firstName} ${ctx.input.lastName}**.`
    };
  })
  .build();

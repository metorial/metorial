import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { dataObject, resourceSchema } from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve detailed information about a specific person (worker) by their ID. Returns the documented personal information for that worker. Call list_people to discover worker IDs.`,
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('people:read'))
  .input(
    z.object({
      personId: z
        .string()
        .describe('worker_id from list_people; this differs from its HRIS profile id.')
    })
  )
  .output(
    z.object({
      person: resourceSchema.describe('Full person/worker profile')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getPerson(ctx.input.personId);
    let person = dataObject(result, 'person');
    if (String(person.worker_id) !== ctx.input.personId)
      throw createApiServiceError('Deel returned a different resource identity.');

    return {
      output: { person },
      message: `Retrieved profile for **${person.full_name ?? person.first_name ?? ctx.input.personId}**.`
    };
  })
  .build();

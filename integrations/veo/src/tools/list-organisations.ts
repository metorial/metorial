import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let organisationsSchema = z.array(
  z
    .object({
      Id: z.number().optional().describe('Organisation ID'),
      Name: z.string().optional().describe('Organisation name')
    })
    .passthrough()
);

export let listOrganisations = SlateTool.create(spec, {
  name: 'List Organisations',
  key: 'list_organisations',
  description:
    'List the VEO organisations you belong to, including their IDs and names. Use an organisation ID when managing users or filtering groups.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      organisations: organisationsSchema.describe('Organisations available to your account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });
    let result = organisationsSchema.safeParse(await client.listOrganisations());
    if (!result.success) {
      throw createApiServiceError('VEO returned an invalid organisation list.');
    }
    let organisations = result.data;
    return {
      output: { organisations },
      message: `Retrieved **${organisations.length}** organisations.`
    };
  })
  .build();

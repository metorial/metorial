import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { providerRecordSchema } from '../lib/schemas';
import { spec } from '../spec';

let listResource = (
  key: string,
  name: string,
  resource: 'groups' | 'partners' | 'reviews',
  description: string
) =>
  SlateTool.create(spec, { key, name, description, tags: { readOnly: true } })
    .input(z.object({}))
    .output(z.object({ records: z.array(providerRecordSchema), totalCount: z.number() }))
    .handleInvocation(async ctx => {
      let data = await new Client({ token: ctx.auth.token }).request('GET', `/${resource}`);
      let parsed = z.array(providerRecordSchema).safeParse(data);
      if (!parsed.success)
        throw createApiServiceError(`Eventee returned an unexpected ${resource} list.`);
      return {
        output: { records: parsed.data, totalCount: parsed.data.length },
        message: `Retrieved ${parsed.data.length} ${resource}.`
      };
    })
    .build();

export let listGroups = listResource(
  'list_groups',
  'List Groups',
  'groups',
  'List event attendee groups, with IDs, names, feature permissions, ticket names and the default flag. Use a returned ID as groupId when inviting attendees or creating registrations.'
);
export let listPartners = listResource(
  'list_partners',
  'List Partners',
  'partners',
  'List all event partners, including sponsors, exhibitors, booth details, logos and detail-page sections.'
);
export let listReviews = listResource(
  'list_reviews',
  'List Reviews',
  'reviews',
  'List session ratings, stars, comments, reviewer information, and the rated lecture.'
);

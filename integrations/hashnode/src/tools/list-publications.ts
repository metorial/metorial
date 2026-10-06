import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursor, first } from '../lib/schemas';
import { spec } from '../spec';
export const listPublications = SlateTool.create(spec, {
  name: 'List Owned Publications',
  key: 'list_publications',
  description:
    'Discover publications owned by the authenticated user, with exact IDs and URLs. This connection does not list every team publication you can access; team members may supply a known publication ID or hostname.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      first,
      after: cursor.describe('Unchanged cursor from the previous owned-publication page.')
    })
  )
  .output(
    z.object({
      ownerId: z.string(),
      publications: z.array(
        z.object({
          publicationId: z.string(),
          title: z.string(),
          displayTitle: z.string().nullable().optional(),
          url: z.string().nullable().optional(),
          isTeam: z.boolean().nullable().optional()
        })
      ),
      hasNextPage: z.boolean(),
      endCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({ token: ctx.auth.token }).listPublications(ctx.input);
    return {
      output: {
        ownerId: result.ownerId,
        publications: result.publications.map(item => ({
          publicationId: item.id,
          title: item.title,
          displayTitle: item.displayTitle,
          url: item.url,
          isTeam: item.isTeam
        })),
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Retrieved ${result.publications.length} owned publications.`
    };
  })
  .build();

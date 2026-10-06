import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { id, paging, record, z } from '../lib/schemas';
import { spec } from '../spec';

export const listDataStructures = SlateTool.create(spec, {
  key: 'list_data_structures',
  name: 'List Data Structures',
  description:
    'Discover native data structure IDs and field specifications for a team. Use these IDs with manage_data_store. Requires udts:read; call list_organizations then list_teams first.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamId: id.describe('Authorized team ID from list_teams.'),
      limit: z.number().optional().describe('Page size, 1–1000; defaults to 100.'),
      offset: z.number().optional().describe('Nonnegative page offset.')
    })
  )
  .output(
    z.object({
      dataStructures: z.array(
        z.object({
          dataStructureId: id,
          teamId: id,
          name: z.string(),
          strict: z.boolean(),
          spec: z.array(record)
        })
      ),
      page: paging.optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).listDataStructures(ctx.input.teamId, ctx.input);
    return {
      output: {
        dataStructures: result.dataStructures.map(s => ({
          dataStructureId: s.id,
          teamId: s.teamId,
          name: s.name,
          strict: s.strict,
          spec: s.spec
        })),
        page: result.pg
      },
      message: `Returned ${result.dataStructures.length} native data structures in this page.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let listOrganizationData = SlateTool.create(spec, {
  name: 'List Organization Data',
  key: 'list_organization_data',
  description: `Retrieve organizational structure data from Deel. Can list legal entities, teams/groups, or departments. Useful for finding IDs needed when creating contracts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['legal_entities', 'teams', 'departments'])
        .describe('Type of organization data to list')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('List of organization resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result: any;

    switch (ctx.input.resourceType) {
      case 'legal_entities':
        result = await client.listLegalEntities();
        break;
      case 'teams':
        result = await client.listGroups();
        break;
      case 'departments':
        result = await client.listDepartments();
        break;
    }

    let items = result?.data ?? [];

    return {
      output: { items },
      message: `Found ${items.length} ${ctx.input.resourceType.replace(/_/g, ' ')}.`
    };
  })
  .build();

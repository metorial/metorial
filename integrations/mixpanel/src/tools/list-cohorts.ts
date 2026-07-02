import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let listCohorts = SlateTool.create(spec, {
  name: 'List Cohorts',
  key: 'list_cohorts',
  description: `List all saved cohorts in the Mixpanel project. Returns cohort IDs, names, descriptions, and member counts. Cohort IDs can be used to filter profiles in **Query User Profiles**.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      cohorts: z
        .array(
          z.object({
            cohortId: z.number().describe('Cohort ID'),
            name: z.string().describe('Cohort name'),
            description: z.string().describe('Cohort description'),
            createdAt: z.string().describe('Creation timestamp'),
            count: z.number().describe('Number of users in the cohort')
          })
        )
        .describe('Saved cohorts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let cohorts = await client.listCohorts();

    return {
      output: { cohorts },
      message: `Found **${cohorts.length}** saved cohort(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProfiles = SlateTool.create(spec, {
  name: 'List Profiles',
  key: 'list_profiles',
  description: `List all run profiles in the current BugBug project. Profiles define variable configurations and browser settings used when running tests and suites. Use this to find available profile IDs before triggering a run.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for paginated results'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of profiles'),
      profiles: z.array(
        z.object({
          profileId: z.string().describe('Unique identifier of the profile'),
          name: z.string().describe('Name of the profile'),
          variables: z
            .record(z.string(), z.string())
            .describe('Variable key-value pairs defined in this profile'),
          browser: z.string().nullable().describe('Browser configured for this profile')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more pages of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProfiles({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let profiles = result.results.map(p => ({
      profileId: p.id,
      name: p.name,
      variables: p.variables,
      browser: p.browser
    }));

    return {
      output: {
        totalCount: result.count,
        profiles,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** profile(s). Returned ${profiles.length} on this page.`
    };
  })
  .build();

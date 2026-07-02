import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let searchCrm = SlateTool.create(spec, {
  name: 'Search CRM',
  key: 'search_crm',
  description: `Perform a universal search across all entity types in Nutshell CRM. Searches contacts, accounts, leads, and other entities simultaneously. Returns lightweight stub results for fast performance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchQuery: z.string().describe('Search term to find across all CRM entities')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            entityId: z.number().describe('ID of the matched entity'),
            entityType: z
              .string()
              .describe('Type of the matched entity (Contacts, Accounts, Leads, etc.)'),
            name: z.string().optional().describe('Name/label of the matched entity')
          })
        )
        .describe('Search results across all entity types'),
      count: z.number().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let results = await client.searchUniversal(ctx.input.searchQuery);

    let mapped = results.map((r: any) => ({
      entityId: r.id,
      entityType: r.entityType,
      name: r.name || r.description
    }));

    return {
      output: {
        results: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** result(s) for "${ctx.input.searchQuery}".`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    projects: z.array(
      z.object({
        projectId: z.number(),
        title: z.string().nullable().optional(),
        clientId: z.number().nullable().optional(),
        projectType: z.string().nullable().optional(),
        fixedPrice: z.string().nullable().optional(),
        rate: z.string().nullable().optional(),
        complete: z.boolean().nullable().optional(),
        active: z.boolean().nullable().optional(),
        loggedDuration: z.number().nullable().optional()
      })
    ),
    totalCount: z.number(),
    currentPage: z.number(),
    totalPages: z.number()
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in FreshBooks. Returns project details including title, client, type, and duration. Select the account or business discovered by get_identity.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeInput,
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('list_projects', ctx, outputSchema))
  .build();

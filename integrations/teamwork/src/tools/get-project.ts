import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific Teamwork project by its ID, including status, dates, company, and description.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique ID of the project'),
      name: z.string().describe('Project name'),
      description: z.string().optional().describe('Project description'),
      status: z.string().optional().describe('Project status'),
      companyId: z.string().optional().describe('Associated company ID'),
      companyName: z.string().optional().describe('Associated company name'),
      startDate: z.string().optional().describe('Project start date'),
      endDate: z.string().optional().describe('Project end date'),
      createdOn: z.string().optional().describe('Creation date'),
      lastChangedOn: z.string().optional().describe('Last modified date'),
      starred: z.boolean().optional().describe('Whether the project is starred'),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            tagName: z.string()
          })
        )
        .optional()
        .describe('Tags assigned to the project')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getProject(ctx.input.projectId);
    let p = result.project || result;

    let tags = (p.tags || []).map((t: any) => ({
      tagId: String(t.id),
      tagName: t.name || ''
    }));

    return {
      output: {
        projectId: String(p.id),
        name: p.name || '',
        description: p.description || undefined,
        status: p.status || undefined,
        companyId: p.company?.id ? String(p.company.id) : undefined,
        companyName: p.company?.name || undefined,
        startDate: p['start-date'] || p.startDate || undefined,
        endDate: p['end-date'] || p.endDate || undefined,
        createdOn: p['created-on'] || p.createdOn || undefined,
        lastChangedOn: p['last-changed-on'] || p.lastChangedOn || undefined,
        starred: p.starred ?? undefined,
        tags: tags.length > 0 ? tags : undefined
      },
      message: `Retrieved project **${p.name}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getAttributes, getCollection, nullableNumber, requireRecord } from '../lib/response';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve all active tracking projects in your Keyword.com account. Each project groups keywords, domains, and tracking settings together. Use this to discover available projects before working with keywords or rankings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().nullable().describe('Unique project identifier'),
            projectName: z.string().nullable().describe('Name of the project'),
            keywordsCount: z.number().nullable().describe('Number of tracked keywords'),
            tagsCount: z.number().nullable().describe('Number of tags in the project'),
            tags: z.array(z.any()).nullable().describe('Tags associated with the project'),
            authKey: z.string().nullable().describe('Project-level auth key'),
            lastUpdatedAt: z.string().nullable().describe('When keywords were last updated'),
            currencyCode: z.string().nullable().describe('Currency code for the project')
          })
        )
        .describe('List of active projects'),
      rawResponse: z.any().describe('Original project response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listProjects();

    let projects = getCollection(data, 'groups');
    let mapped = projects.map(project => {
      let resource = requireRecord(project, 'project');
      let p = getAttributes(resource);
      let projectId = p.project_id ?? resource.id;
      let count = p.keywords_count;
      if (count !== null && typeof count === 'object' && !Array.isArray(count))
        count = count.ACTIVE;
      if (Array.isArray(count) && count.length === 0) count = undefined;
      return {
        projectId: projectId == null ? null : String(projectId),
        projectName: p.category ?? p.name ?? resource.id ?? null,
        keywordsCount: nullableNumber(count, 'active keyword count'),
        tagsCount: nullableNumber(p.tags_count, 'tag count'),
        tags: p.tags ?? null,
        authKey: p.auth ?? null,
        lastUpdatedAt: p.keywords_last_updated_at ?? null,
        currencyCode: p.currency_code ?? null
      };
    });

    return {
      output: { projects: mapped, rawResponse: data },
      message: `Found **${mapped.length}** active project(s).`
    };
  })
  .build();

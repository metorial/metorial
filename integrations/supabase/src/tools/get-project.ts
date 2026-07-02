import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific Supabase project, including its configuration, status, database host, and API keys.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectRef: z.string().describe('Project reference ID')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Project reference ID'),
      name: z.string().describe('Project name'),
      organizationId: z.string().describe('Organization ID'),
      region: z.string().describe('Database region'),
      status: z.string().describe('Project status'),
      databaseHost: z.string().describe('Database host URL'),
      createdAt: z.string().describe('Project creation timestamp'),
      apiKeys: z
        .array(
          z.object({
            name: z.string().describe('Key name (e.g., anon, service_role)'),
            keyValue: z.string().describe('The API key value')
          })
        )
        .optional()
        .describe('Project API keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient(ctx.auth.token);

    let [project, apiKeys] = await Promise.all([
      client.getProject(ctx.input.projectRef),
      client.getProjectApiKeys(ctx.input.projectRef).catch(() => [])
    ]);

    let keys = (Array.isArray(apiKeys) ? apiKeys : []).map((k: any) => ({
      name: k.name ?? '',
      keyValue: k.api_key ?? ''
    }));

    return {
      output: {
        projectId: project.id ?? project.ref ?? '',
        name: project.name ?? '',
        organizationId: project.organization_id ?? '',
        region: project.region ?? '',
        status: project.status ?? '',
        databaseHost: project.database?.host ?? '',
        createdAt: project.created_at ?? '',
        apiKeys: keys.length > 0 ? keys : undefined
      },
      message: `Retrieved project **${project.name}** (${ctx.input.projectRef}) — status: ${project.status ?? 'unknown'}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listApplications = SlateTool.create(spec, {
  name: 'List Applications',
  key: 'list_applications',
  description: `List all applications in a given workspace. Applications are the main building blocks in Appsmith, containing pages, datasources, queries, and JS objects.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to list applications for.')
    })
  )
  .output(
    z.object({
      applications: z
        .array(
          z.object({
            applicationId: z.string().describe('Unique application identifier.'),
            name: z.string().describe('Application name.'),
            slug: z.string().optional().describe('Application URL slug.'),
            isPublic: z
              .boolean()
              .optional()
              .describe('Whether the application is publicly accessible.'),
            color: z.string().optional().describe('Application theme color.'),
            icon: z.string().optional().describe('Application icon identifier.'),
            lastDeployedAt: z
              .string()
              .optional()
              .describe('Timestamp of the last deployment.'),
            lastEditedAt: z.string().optional().describe('Timestamp of the last edit.'),
            gitConnected: z
              .boolean()
              .optional()
              .describe('Whether the application is connected to a Git repository.')
          })
        )
        .describe('List of applications.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let apps = await client.listApplications(ctx.input.workspaceId);

    let mapped = apps.map((app: any) => ({
      applicationId: app.id ?? '',
      name: app.name ?? '',
      slug: app.slug,
      isPublic: app.isPublic,
      color: app.color,
      icon: app.icon,
      lastDeployedAt: app.lastDeployedAt,
      lastEditedAt: app.lastEditedAt,
      gitConnected: !!app.gitApplicationMetadata
    }));

    return {
      output: { applications: mapped },
      message: `Found **${mapped.length}** application(s) in workspace.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageProject = SlateTool.create(spec, {
  name: 'Manage Project',
  key: 'manage_project',
  description: `Create, update, fork, or delete a GitLab project. Use the **action** field to specify the operation. For creating, provide a name and optional settings. For updating, provide the project ID and fields to change. For forking, provide the source project ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'fork'])
        .describe('Operation to perform on the project'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID or URL-encoded path (required for update, delete, fork)'),
      name: z
        .string()
        .optional()
        .describe('Project name (required for create, optional for update)'),
      description: z.string().optional().describe('Project description'),
      visibility: z
        .enum(['public', 'internal', 'private'])
        .optional()
        .describe('Project visibility level'),
      defaultBranch: z.string().optional().describe('Default branch name'),
      initializeWithReadme: z
        .boolean()
        .optional()
        .describe('Initialize repository with a README (create only)'),
      namespaceId: z
        .number()
        .optional()
        .describe('Namespace ID to create/fork the project in'),
      path: z.string().optional().describe('Project path/slug'),
      archived: z
        .boolean()
        .optional()
        .describe('Whether to archive/unarchive the project (update only)')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Unique project ID'),
      name: z.string().describe('Project name'),
      pathWithNamespace: z.string().describe('Full path including namespace'),
      webUrl: z.string().describe('URL to the project'),
      visibility: z.string().describe('Visibility level'),
      defaultBranch: z.string().nullable().describe('Default branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let project: any;

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name)
          throw gitLabServiceError('Project name is required for create action');
        project = await client.createProject({
          name: ctx.input.name,
          path: ctx.input.path,
          description: ctx.input.description,
          visibility: ctx.input.visibility,
          initializeWithReadme: ctx.input.initializeWithReadme,
          namespaceId: ctx.input.namespaceId,
          defaultBranch: ctx.input.defaultBranch
        });
        break;
      }
      case 'update': {
        if (!ctx.input.projectId)
          throw gitLabServiceError('Project ID is required for update action');
        project = await client.updateProject(ctx.input.projectId, {
          name: ctx.input.name,
          description: ctx.input.description,
          visibility: ctx.input.visibility,
          defaultBranch: ctx.input.defaultBranch,
          archived: ctx.input.archived
        });
        break;
      }
      case 'delete': {
        if (!ctx.input.projectId)
          throw gitLabServiceError('Project ID is required for delete action');
        let existing = await client.getProject(ctx.input.projectId);
        await client.deleteProject(ctx.input.projectId);
        return {
          output: {
            projectId: existing.id,
            name: existing.name,
            pathWithNamespace: existing.path_with_namespace,
            webUrl: existing.web_url,
            visibility: existing.visibility,
            defaultBranch: existing.default_branch
          },
          message: `Deleted project **${existing.name}** (\`${existing.path_with_namespace}\`)`
        };
      }
      case 'fork': {
        if (!ctx.input.projectId)
          throw gitLabServiceError('Project ID is required for fork action');
        project = await client.forkProject(ctx.input.projectId, {
          namespace: undefined,
          namespaceId: ctx.input.namespaceId,
          name: ctx.input.name,
          path: ctx.input.path
        });
        break;
      }
    }

    let actionVerb =
      ctx.input.action === 'create'
        ? 'Created'
        : ctx.input.action === 'update'
          ? 'Updated'
          : 'Forked';

    return {
      output: {
        projectId: project.id,
        name: project.name,
        pathWithNamespace: project.path_with_namespace,
        webUrl: project.web_url,
        visibility: project.visibility,
        defaultBranch: project.default_branch
      },
      message: `${actionVerb} project **${project.name}** at [${project.web_url}](${project.web_url})`
    };
  })
  .build();

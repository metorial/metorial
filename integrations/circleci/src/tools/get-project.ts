import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve information about a CircleCI project, including its VCS URL, organization, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Project slug in the format vcs-slug/org-name/repo-name')
    })
  )
  .output(
    z.object({
      projectSlug: z.string(),
      projectName: z.string().optional(),
      organizationName: z.string().optional(),
      organizationId: z.string().optional(),
      vcsUrl: z.string().optional(),
      vcsProvider: z.string().optional(),
      vcsDefaultBranch: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let project = await client.getProject(ctx.input.projectSlug);

    return {
      output: {
        projectSlug: project.slug,
        projectName: project.name,
        organizationName: project.organization_name,
        organizationId: project.organization_id,
        vcsUrl: project.vcs_url,
        vcsProvider: project.vcs_info?.provider,
        vcsDefaultBranch: project.vcs_info?.default_branch
      },
      message: `Project **${project.name || project.slug}** (${project.vcs_info?.provider || 'unknown VCS'}).`
    };
  })
  .build();

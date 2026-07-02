import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific project by its slug. Returns the project's signing policies, artifact configurations, and other settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectSlug: z.string().describe('Slug identifier of the project')
    })
  )
  .output(
    z.object({
      slug: z.string().describe('Slug identifier of the project'),
      name: z.string().describe('Name of the project'),
      description: z.string().describe('Description of the project'),
      isActive: z.boolean().describe('Whether the project is active'),
      signingPolicies: z
        .array(
          z.object({
            slug: z.string().describe('Slug identifier of the signing policy'),
            name: z.string().describe('Name of the signing policy'),
            isActive: z.boolean().describe('Whether the signing policy is active')
          })
        )
        .describe('Signing policies configured for this project'),
      artifactConfigurations: z
        .array(
          z.object({
            slug: z.string().describe('Slug identifier of the artifact configuration'),
            name: z.string().describe('Name of the artifact configuration'),
            isActive: z.boolean().describe('Whether the artifact configuration is active')
          })
        )
        .describe('Artifact configurations for this project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let project = await client.getProject(ctx.input.projectSlug);

    let output = {
      slug: project.slug || '',
      name: project.name || '',
      description: project.description || '',
      isActive: project.isActive ?? true,
      signingPolicies: (project.signingPolicies || []).map(sp => ({
        slug: sp.slug || '',
        name: sp.name || '',
        isActive: sp.isActive ?? true
      })),
      artifactConfigurations: (project.artifactConfigurations || []).map(ac => ({
        slug: ac.slug || '',
        name: ac.name || '',
        isActive: ac.isActive ?? true
      }))
    };

    return {
      output,
      message: `Project **${output.name}** (${output.slug}) has ${output.signingPolicies.length} signing policy/policies and ${output.artifactConfigurations.length} artifact configuration(s).`
    };
  })
  .build();

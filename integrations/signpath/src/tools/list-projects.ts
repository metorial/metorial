import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignPathClient } from '../lib/client';
import { spec } from '../spec';

let signingPolicySchema = z.object({
  slug: z.string().describe('Slug identifier of the signing policy'),
  name: z.string().describe('Name of the signing policy'),
  isActive: z.boolean().describe('Whether the signing policy is active')
});

let artifactConfigSchema = z.object({
  slug: z.string().describe('Slug identifier of the artifact configuration'),
  name: z.string().describe('Name of the artifact configuration'),
  isActive: z.boolean().describe('Whether the artifact configuration is active')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the organization. Returns project details including their signing policies and artifact configurations. Use this to discover available projects and their slugs for signing request submission.`,
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
            slug: z.string().describe('Slug identifier of the project'),
            name: z.string().describe('Name of the project'),
            description: z.string().describe('Description of the project'),
            isActive: z.boolean().describe('Whether the project is active'),
            signingPolicies: z
              .array(signingPolicySchema)
              .describe('Signing policies configured for this project'),
            artifactConfigurations: z
              .array(artifactConfigSchema)
              .describe('Artifact configurations for this project')
          })
        )
        .describe('List of all projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignPathClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      baseUrl: ctx.config.baseUrl
    });

    let projects = await client.listProjects();

    let mapped = projects.map(p => ({
      slug: p.slug || '',
      name: p.name || '',
      description: p.description || '',
      isActive: p.isActive ?? true,
      signingPolicies: (p.signingPolicies || []).map(sp => ({
        slug: sp.slug || '',
        name: sp.name || '',
        isActive: sp.isActive ?? true
      })),
      artifactConfigurations: (p.artifactConfigurations || []).map(ac => ({
        slug: ac.slug || '',
        name: ac.name || '',
        isActive: ac.isActive ?? true
      }))
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s) in the organization.`
    };
  })
  .build();

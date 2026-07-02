import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let projectOutput = z.object({
  projectId: z.string().describe('Project ID'),
  uuid: z.string().optional().describe('Project UUID'),
  name: z.string().describe('Project name'),
  apiToken: z.string().optional().describe('Project API token for event capture'),
  timezone: z.string().optional().describe('Project timezone'),
  isDemo: z.boolean().optional().describe('Whether this is a demo project'),
  organizationId: z.string().optional().describe('Owning organization ID')
});

let mapProject = (project: any) => ({
  projectId: String(project.id ?? project.project_id),
  uuid: project.uuid,
  name: String(project.name ?? ''),
  apiToken: project.api_token,
  timezone: project.timezone,
  isDemo: project.is_demo,
  organizationId:
    typeof project.organization === 'string'
      ? project.organization
      : project.organization?.id
        ? String(project.organization.id)
        : undefined
});

export let listOrganizationsTool = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List PostHog organizations accessible with the current credentials. Use an organization ID with List Projects for the current documented project API.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of organizations to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationId: z.string().describe('Organization ID'),
          name: z.string().describe('Organization name'),
          slug: z.string().optional().describe('Organization slug'),
          projects: z.array(projectOutput).optional().describe('Projects included inline'),
          projectCount: z.number().optional().describe('Number of projects included inline')
        })
      ),
      totalCount: z.number().optional().describe('Total count of organizations'),
      hasMore: z.boolean().describe('Whether there are more organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listOrganizations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let rawOrganizations = Array.isArray(data) ? data : data.results || [];
    let organizations = rawOrganizations.map((organization: any) => {
      let projects = Array.isArray(organization.projects)
        ? organization.projects.map(mapProject)
        : undefined;

      return {
        organizationId: String(organization.id),
        name: String(organization.name ?? ''),
        slug: organization.slug,
        projects,
        projectCount: projects?.length
      };
    });

    return {
      output: {
        organizations,
        totalCount: data.count,
        hasMore: !!data.next
      },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects accessible with the current credentials. Provide organizationId to use PostHog's current organization-scoped project endpoint.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID. Use List Organizations to discover it.'),
      search: z.string().optional().describe('Search by project name'),
      limit: z.number().optional().describe('Maximum number of projects to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      projects: z.array(projectOutput),
      totalCount: z.number().optional().describe('Total count of projects'),
      hasMore: z.boolean().describe('Whether there are more projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listProjects({
      organizationId: ctx.input.organizationId,
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let rawProjects = Array.isArray(data) ? data : data.results || [];
    let projects = rawProjects.map(mapProject);

    return {
      output: {
        projects,
        totalCount: data.count,
        hasMore: !!data.next
      },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve the current PostHog user, current organization, and current team/project context.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('PostHog user ID'),
      uuid: z.string().optional().describe('PostHog user UUID'),
      email: z.string().optional().describe('User email'),
      name: z.string().optional().describe('User display name'),
      currentOrganizationId: z.string().optional().describe('Current organization ID'),
      currentOrganizationName: z.string().optional().describe('Current organization name'),
      currentProjectId: z.string().optional().describe('Current project/team ID'),
      currentProjectName: z.string().optional().describe('Current project/team name'),
      currentProjectToken: z
        .string()
        .optional()
        .describe('Current project API token for public endpoints')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let user = await client.getCurrentUser();
    let name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || undefined;

    return {
      output: {
        userId: String(user.id ?? user.uuid ?? ''),
        uuid: user.uuid,
        email: user.email,
        name,
        currentOrganizationId: user.organization?.id
          ? String(user.organization.id)
          : user.organization
            ? String(user.organization)
            : undefined,
        currentOrganizationName: user.organization?.name,
        currentProjectId: user.team?.id ? String(user.team.id) : undefined,
        currentProjectName: user.team?.name,
        currentProjectToken: user.team?.api_token
      },
      message: `Retrieved PostHog user **${user.email || user.id}**.`
    };
  })
  .build();

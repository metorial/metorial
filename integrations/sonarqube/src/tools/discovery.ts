import { z } from 'zod';
import {
  branchPullRequestInputs,
  branchSchema,
  componentSchema,
  createClient,
  mapBranch,
  mapComponent,
  mapPullRequest,
  pageSchema,
  paginationInputs,
  projectInput,
  projectKeyFromInput,
  pullRequestSchema,
  rawRecordSchema,
  readOnlyTool
} from './shared';

export let searchProjectsTool = readOnlyTool({
  name: 'Search Projects',
  key: 'search_projects',
  description:
    'Search SonarQube projects by text query or project keys. Returns project keys, names, qualifiers, visibility, and latest analysis metadata.',
  instructions: [
    'For SonarQube Cloud, provide organization input or configure a default organization.'
  ]
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('SonarQube Cloud organization key. Defaults to config.organization.'),
      query: z.string().optional().describe('Search text for project name or key.'),
      projectKeys: z
        .array(z.string())
        .optional()
        .describe('Specific project keys to include. Sent as SonarQube projects.'),
      qualifiers: z
        .array(z.string())
        .optional()
        .describe('Optional component qualifiers such as TRK, APP, or VW.'),
      ...paginationInputs(50, 500)
    })
  )
  .output(
    z.object({
      projects: z.array(componentSchema).describe('Matching SonarQube projects/components.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.searchProjects(ctx.input);
    let projects = result.items.map(mapComponent);

    return {
      output: {
        projects,
        page: result.page
      },
      message: `Found **${projects.length}** SonarQube projects.`
    };
  })
  .build();

export let getComponentTool = readOnlyTool({
  name: 'Get Component',
  key: 'get_component',
  description:
    'Get a SonarQube component, file, directory, project, or portfolio by component key, including ancestor metadata when returned.'
})
  .input(
    z.object({
      component: z.string().describe('Component key to retrieve.'),
      ...branchPullRequestInputs
    })
  )
  .output(
    z.object({
      component: componentSchema.describe('Normalized SonarQube component.'),
      ancestors: z.array(componentSchema).optional().describe('Ancestor components.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getComponent(ctx.input);
    let component =
      typeof data.component === 'object' && data.component !== null
        ? (data.component as Record<string, unknown>)
        : data;
    let ancestors = Array.isArray(data.ancestors)
      ? data.ancestors
          .filter(
            (item): item is Record<string, unknown> =>
              typeof item === 'object' && item !== null
          )
          .map(mapComponent)
      : undefined;

    return {
      output: {
        component: mapComponent(component),
        ancestors,
        raw: data
      },
      message: `Retrieved SonarQube component **${ctx.input.component}**.`
    };
  })
  .build();

export let listComponentTreeTool = readOnlyTool({
  name: 'List Component Tree',
  key: 'list_component_tree',
  description:
    'List child components under a SonarQube project, directory, or file, optionally filtered by branch, pull request, query text, and qualifiers.'
})
  .input(
    z.object({
      component: z.string().describe('Root component key to browse.'),
      query: z.string().optional().describe('Search text for child components.'),
      qualifiers: z
        .array(z.string())
        .optional()
        .describe('Component qualifiers such as DIR, FIL, UTS, or TRK.'),
      ...branchPullRequestInputs,
      ...paginationInputs(100, 500)
    })
  )
  .output(
    z.object({
      components: z.array(componentSchema).describe('Matching child components.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listComponentTree(ctx.input);
    let components = result.items.map(mapComponent);

    return {
      output: {
        components,
        page: result.page
      },
      message: `Found **${components.length}** components under **${ctx.input.component}**.`
    };
  })
  .build();

export let listProjectBranchesTool = readOnlyTool({
  name: 'List Project Branches',
  key: 'list_project_branches',
  description:
    'List branches analyzed for a SonarQube project, including main branch and branch analysis status metadata when available.'
})
  .input(z.object(projectInput))
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      branches: z.array(branchSchema).describe('Project branches.')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.listProjectBranches(projectKey);
    let branches = result.items.map(mapBranch);

    return {
      output: {
        projectKey,
        branches
      },
      message: `Found **${branches.length}** branches for SonarQube project **${projectKey}**.`
    };
  })
  .build();

export let listProjectPullRequestsTool = readOnlyTool({
  name: 'List Project Pull Requests',
  key: 'list_project_pull_requests',
  description:
    'List pull request analyses for a SonarQube project, including source branch, target branch, and status metadata when available.'
})
  .input(z.object(projectInput))
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      pullRequests: z.array(pullRequestSchema).describe('Project pull request analyses.')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.listProjectPullRequests(projectKey);
    let pullRequests = result.items.map(mapPullRequest);

    return {
      output: {
        projectKey,
        pullRequests
      },
      message: `Found **${pullRequests.length}** pull requests for SonarQube project **${projectKey}**.`
    };
  })
  .build();

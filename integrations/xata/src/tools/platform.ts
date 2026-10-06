import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { resolveOrganization, XataPlatformClient } from '../lib/platform';
import { spec } from '../spec';

const organizationId = z
  .string()
  .optional()
  .describe(
    'Current organization ID from list_organizations; defaults to configured organizationId'
  );
const projectId = z.string().describe('Current project ID from list_projects');
const branchId = z
  .string()
  .describe('Current branch ID from list_project_branches or create_project_branch');
const details = z.record(z.string(), z.unknown());

export const listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description:
    'List the current Xata organizations accessible to this API key. Requires org:read; these organization IDs are distinct from retired Xata Lite workspace IDs.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ organizations: z.array(details), returnedCount: z.number() }))
  .handleInvocation(async ctx => {
    const result = await new XataPlatformClient({ token: ctx.auth.token }).listOrganizations();
    return {
      output: {
        organizations: result.organizations,
        returnedCount: result.organizations.length
      },
      message: `Found ${result.organizations.length} Xata organizations.`
    };
  })
  .build();
export const listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'List accessible projects in a current Xata organization. Requires project:read. Projects contain Postgres branches; they are distinct from retired Lite databases.',
  tags: { readOnly: true }
})
  .input(z.object({ organizationId }))
  .output(z.object({ projects: z.array(details), returnedCount: z.number() }))
  .handleInvocation(async ctx => {
    const result = await new XataPlatformClient({ token: ctx.auth.token }).listProjects(
      resolveOrganization(ctx.input.organizationId, ctx.config.organizationId)
    );
    return {
      output: { projects: result.projects, returnedCount: result.projects.length },
      message: `Found ${result.projects.length} Xata projects.`
    };
  })
  .build();
export const getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Inspect a current Xata project and its scale-to-zero configuration. Requires project:read; discover its ID with list_projects.',
  tags: { readOnly: true }
})
  .input(z.object({ organizationId, projectId }))
  .output(z.object({ project: details }))
  .handleInvocation(async ctx => {
    const project = await new XataPlatformClient({ token: ctx.auth.token }).getProject(
      resolveOrganization(ctx.input.organizationId, ctx.config.organizationId),
      ctx.input.projectId
    );
    return { output: { project }, message: 'Retrieved the Xata project.' };
  })
  .build();
export const listProjectBranches = SlateTool.create(spec, {
  name: 'List Project Branches',
  key: 'list_project_branches',
  description:
    'List current Postgres branches in a project. Requires branch:read. Returns metadata without database credentials; the API returns the complete accessible collection.',
  tags: { readOnly: true }
})
  .input(z.object({ organizationId, projectId }))
  .output(z.object({ branches: z.array(details), returnedCount: z.number() }))
  .handleInvocation(async ctx => {
    const result = await new XataPlatformClient({ token: ctx.auth.token }).listBranches(
      resolveOrganization(ctx.input.organizationId, ctx.config.organizationId),
      ctx.input.projectId
    );
    return {
      output: { branches: result.branches, returnedCount: result.branches.length },
      message: `Found ${result.branches.length} project branches.`
    };
  })
  .build();
export const getProjectBranch = SlateTool.create(spec, {
  name: 'Get Project Branch',
  key: 'get_project_branch',
  description:
    'Read current Postgres branch metadata, provisioning/health status and compute configuration without database credentials. Use this to check asynchronous creation or state changes. Requires branch:read.',
  tags: { readOnly: true }
})
  .input(z.object({ organizationId, projectId, branchId }))
  .output(z.object({ branch: details }))
  .handleInvocation(async ctx => {
    const branch = await new XataPlatformClient({ token: ctx.auth.token }).getBranch(
      resolveOrganization(ctx.input.organizationId, ctx.config.organizationId),
      ctx.input.projectId,
      ctx.input.branchId
    );
    return { output: { branch }, message: 'Retrieved the current Postgres branch.' };
  })
  .build();
export const createProjectBranch = SlateTool.create(spec, {
  name: 'Create Project Branch',
  key: 'create_project_branch',
  description:
    'Provision a new Postgres branch inheriting data and configuration from an explicitly selected parent branch. This allocates billable compute/storage and can copy sensitive parent data. Requires branch:write. Provisioning is asynchronous; use get_project_branch to check readiness.',
  tags: { readOnly: false, destructive: false },
  instructions: [
    'Verify the organization, project and parent branch before creation. For testing, use a dedicated disposable parent containing controlled test data.'
  ]
})
  .input(
    z.object({
      organizationId,
      projectId,
      name: z.string().describe('Name for the newly provisioned branch'),
      parentBranchId: z
        .string()
        .describe('Explicit parent branch ID to inherit configuration and data from'),
      description: z
        .string()
        .optional()
        .describe(
          'Optional purpose, up to 255 characters, beginning with a letter or digit; letters/digits, spaces, hyphens, underscores, dots, slashes and colons are allowed'
        )
    })
  )
  .output(z.object({ branch: details }))
  .handleInvocation(async ctx => {
    const branch = await new XataPlatformClient({ token: ctx.auth.token }).createBranch(
      resolveOrganization(ctx.input.organizationId, ctx.config.organizationId),
      ctx.input.projectId,
      {
        name: ctx.input.name,
        parentBranchId: ctx.input.parentBranchId,
        description: ctx.input.description
      }
    );
    return {
      output: { branch },
      message:
        'Submitted Postgres branch provisioning. Inspect the branch status before using it.'
    };
  })
  .build();
export const updateProjectBranch = SlateTool.create(spec, {
  name: 'Update Project Branch',
  key: 'update_project_branch',
  description:
    'Change a current Postgres branch name, description, hibernation or scale-to-zero settings. Hibernation changes availability; waking a branch allocates compute and can incur charges. Requires branch:write. Use get_project_branch to read back asynchronous state changes.',
  tags: { readOnly: false, destructive: true },
  instructions: [
    'Disable automatic scale-to-zero before enabling manual hibernation; the two modes cannot be enabled simultaneously.'
  ]
})
  .input(
    z.object({
      organizationId,
      projectId,
      branchId,
      name: z.string().optional().describe('Updated branch name'),
      description: z
        .string()
        .optional()
        .describe('Updated purpose, up to 255 permitted characters; empty string clears it'),
      hibernate: z
        .boolean()
        .optional()
        .describe('true hibernates the branch; false wakes it and can incur compute charges'),
      scaleToZeroEnabled: z
        .boolean()
        .optional()
        .describe(
          'Whether inactive compute automatically hibernates; supply with inactivityPeriodMinutes'
        ),
      inactivityPeriodMinutes: z
        .number()
        .optional()
        .describe('Positive integer idle interval; supply with scaleToZeroEnabled')
    })
  )
  .output(z.object({ branch: details }))
  .handleInvocation(async ctx => {
    const { name, description, hibernate, scaleToZeroEnabled, inactivityPeriodMinutes } =
      ctx.input;
    if ((scaleToZeroEnabled === undefined) !== (inactivityPeriodMinutes === undefined))
      throw createApiServiceError(
        'Supply scaleToZeroEnabled and inactivityPeriodMinutes together.'
      );
    const branch = await new XataPlatformClient({ token: ctx.auth.token }).updateBranch(
      resolveOrganization(ctx.input.organizationId, ctx.config.organizationId),
      ctx.input.projectId,
      ctx.input.branchId,
      {
        name,
        description,
        hibernate,
        scaleToZero:
          scaleToZeroEnabled === undefined || inactivityPeriodMinutes === undefined
            ? undefined
            : { enabled: scaleToZeroEnabled, inactivityPeriodMinutes }
      }
    );
    return {
      output: { branch },
      message:
        'Submitted the Postgres branch update. Read back its current status to verify state changes.'
    };
  })
  .build();
export const deleteProjectBranch = SlateTool.create(spec, {
  name: 'Delete Project Branch',
  key: 'delete_project_branch',
  description:
    'Permanently delete a current Postgres branch and all its unique data. Requires branch:write. Verify the target with get_project_branch; deletion cannot be undone.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ organizationId, projectId, branchId }))
  .output(z.object({ branchId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new XataPlatformClient({ token: ctx.auth.token }).deleteBranch(
      resolveOrganization(ctx.input.organizationId, ctx.config.organizationId),
      ctx.input.projectId,
      ctx.input.branchId
    );
    return {
      output: { branchId: ctx.input.branchId, deleted: true },
      message: 'Deleted the Postgres branch.'
    };
  })
  .build();

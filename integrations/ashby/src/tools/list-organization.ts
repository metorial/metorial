import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
import {
  email,
  id,
  invalid,
  pageInput,
  pageOutput,
  pageSchema,
  rows,
  str,
  warningsSchema
} from '../lib/contracts';
import { spec } from '../spec';

let itemOutputSchema = z.object({
  resourceId: z.string().describe('Unique resource ID'),
  name: z.string().describe('Display name of the resource'),
  resourceType: z.string().describe('Type of resource'),
  additionalFields: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional fields specific to the resource type')
});

export let listOrganizationTool = SlateTool.create(spec, {
  name: 'List Organization Data',
  key: 'list_organization',
  description: `Discovers departments, locations, users, sources, archive reasons, tags, candidates, projects, custom fields, interview plans/stages/interviews and hiring roles needed by the existing tools. Returns one page where pagination is supported; user search requires an exact email.`,
  instructions: [
    'Use resourceType to specify which kind of organization data to retrieve.',
    'The searchTerm parameter only applies when resourceType is "users".',
    'Results are normalized to a common format with resourceId, name, resourceType, and optional additionalFields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum([
          'departments',
          'locations',
          'users',
          'sources',
          'archive_reasons',
          'candidate_tags',
          'interview_stages',
          'candidates',
          'projects',
          'custom_fields',
          'interview_plans',
          'interviews',
          'hiring_roles'
        ])
        .describe('Type of organization data to list'),
      interviewPlanId: z
        .string()
        .optional()
        .describe(
          'Required for interview_stages; use interview_plans or the target job to discover it.'
        ),
      syncToken: z
        .string()
        .optional()
        .describe('Incremental sync token for paginated resources.'),
      searchTerm: z.string().optional().describe('Search term (only applicable for users)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      items: z.array(itemOutputSchema).describe('List of organization resources'),
      nextCursor: z.string().optional().describe('Pagination cursor for the next page'),
      warnings: warningsSchema,
      pageInfo: pageSchema.optional(),
      completedActions: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AshbyClient(ctx.auth),
      input = ctx.input;
    pageInput(input);
    if (input.searchTerm !== undefined && input.resourceType !== 'users')
      invalid('searchTerm is supported only for users and must be an exact email address.');
    const endpoints: Record<string, string> = {
      departments: '/department.list',
      locations: '/location.list',
      users: '/user.list',
      sources: '/source.list',
      archive_reasons: '/archiveReason.list',
      candidate_tags: '/candidateTag.list',
      interview_stages: '/interviewStage.list',
      candidates: '/candidate.list',
      projects: '/project.list',
      custom_fields: '/customField.list',
      interview_plans: '/interviewPlan.list',
      interviews: '/interview.list',
      hiring_roles: '/applicationHiringTeamRole.list'
    };
    let result: Record<string, unknown>,
      paginated = true;
    if (input.resourceType === 'interview_stages') {
      if (input.interviewPlanId === undefined)
        invalid(
          'interview_stages requires interviewPlanId. First discover a plan through list_organization interview_plans or the exact target job.'
        );
      if (input.cursor !== undefined || input.syncToken !== undefined)
        invalid('Interview stage listing is not paginated.');
      result = await client.post(endpoints[input.resourceType]!, {
        interviewPlanId: id(input.interviewPlanId, 'Interview plan ID')
      });
      paginated = false;
    } else if (
      input.resourceType === 'hiring_roles' ||
      input.resourceType === 'archive_reasons' ||
      input.resourceType === 'sources'
    ) {
      if (input.cursor !== undefined || input.syncToken !== undefined)
        invalid('This resource listing is not paginated.');
      result = await client.post(endpoints[input.resourceType]!);
      paginated = false;
    } else if (input.resourceType === 'users' && input.searchTerm !== undefined) {
      if (input.cursor !== undefined || input.syncToken !== undefined)
        invalid('Exact user email search is not paginated.');
      result = await client.post('/user.search', { email: email(input.searchTerm) });
      paginated = false;
    } else result = await client.list(endpoints[input.resourceType]!, input);
    const items = rows(result.results).map(value => {
      const name =
        value.name ??
        value.title ??
        value.text ??
        (input.resourceType === 'users'
          ? [str(value.firstName), str(value.lastName)].join(' ')
          : undefined);
      const additionalFields: Record<string, unknown> = {};
      const metadata = [
        'sourceType',
        'parentId',
        'isRemote',
        'workplaceType',
        'email',
        'reasonType',
        'interviewPlanId',
        'type',
        'isArchived',
        'fieldType',
        'objectType',
        'selectableValues',
        'defaultInterviewPlanId',
        'createdAt',
        'updatedAt'
      ];
      for (const key of metadata)
        if (value[key] !== undefined) additionalFields[key] = value[key];
      return {
        resourceId: str(value.id),
        name: str(name),
        resourceType: {
          departments: 'department',
          locations: 'location',
          users: 'user',
          sources: 'source',
          archive_reasons: 'archive_reason',
          candidate_tags: 'candidate_tag',
          interview_stages: 'interview_stage',
          candidates: 'candidate',
          projects: 'project',
          custom_fields: 'custom_field',
          interview_plans: 'interview_plan',
          interviews: 'interview',
          hiring_roles: 'hiring_role'
        }[input.resourceType],
        additionalFields
      };
    });
    return {
      output: { items, ...pageOutput(result, paginated), warnings: client.warnings },
      message: paginated
        ? 'Retrieved one prerequisite-resource page. Follow pageInfo to complete discovery.'
        : 'Retrieved the documented nonpaginated prerequisite resources.'
    };
  })
  .build();

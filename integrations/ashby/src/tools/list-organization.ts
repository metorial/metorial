import { SlateTool } from 'slates';
import { z } from 'zod';
import { AshbyClient } from '../lib/client';
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
  description: `Lists departments, locations, users, sources, archive reasons, candidate tags, or interview stages from the Ashby organization. Returns results in a consistent format regardless of resource type.`,
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
          'interview_stages'
        ])
        .describe('Type of organization data to list'),
      searchTerm: z.string().optional().describe('Search term (only applicable for users)'),
      cursor: z.string().optional().describe('Pagination cursor'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      items: z.array(itemOutputSchema).describe('List of organization resources'),
      nextCursor: z.string().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AshbyClient({ token: ctx.auth.token });
    let { resourceType, searchTerm, cursor, perPage } = ctx.input;

    let items: Array<{
      resourceId: string;
      name: string;
      resourceType: string;
      additionalFields?: Record<string, any>;
    }> = [];
    let nextCursor: string | undefined;

    if (resourceType === 'departments') {
      let result = await client.listDepartments();
      items = (result.results || []).map((d: any) => ({
        resourceId: d.id,
        name: d.name,
        resourceType: 'department',
        additionalFields: d.parentId ? { parentId: d.parentId } : undefined
      }));
    } else if (resourceType === 'locations') {
      let result = await client.listLocations();
      items = (result.results || []).map((l: any) => ({
        resourceId: l.id,
        name: l.name,
        resourceType: 'location',
        additionalFields: l.isRemote !== undefined ? { isRemote: l.isRemote } : undefined
      }));
    } else if (resourceType === 'users') {
      if (searchTerm) {
        let result = await client.searchUsers({ term: searchTerm });
        items = (result.results || []).map((u: any) => ({
          resourceId: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' '),
          resourceType: 'user',
          additionalFields: { email: u.email }
        }));
      } else {
        let result = await client.listUsers({ cursor, perPage });
        items = (result.results || []).map((u: any) => ({
          resourceId: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' '),
          resourceType: 'user',
          additionalFields: { email: u.email }
        }));
        nextCursor = result.moreDataAvailable ? result.nextCursor : undefined;
      }
    } else if (resourceType === 'sources') {
      let result = await client.listSources();
      items = (result.results || []).map((s: any) => ({
        resourceId: s.id,
        name: s.title,
        resourceType: 'source'
      }));
    } else if (resourceType === 'archive_reasons') {
      let result = await client.listArchiveReasons();
      items = (result.results || []).map((r: any) => ({
        resourceId: r.id,
        name: r.text,
        resourceType: 'archive_reason',
        additionalFields: r.reasonType ? { reasonType: r.reasonType } : undefined
      }));
    } else if (resourceType === 'candidate_tags') {
      let result = await client.listCandidateTags();
      items = (result.results || []).map((t: any) => ({
        resourceId: t.id,
        name: t.title,
        resourceType: 'candidate_tag'
      }));
    } else if (resourceType === 'interview_stages') {
      let result = await client.listInterviewStages({ cursor, perPage });
      items = (result.results || []).map((s: any) => ({
        resourceId: s.id,
        name: s.title,
        resourceType: 'interview_stage',
        additionalFields: s.interviewPlanId
          ? { interviewPlanId: s.interviewPlanId }
          : undefined
      }));
      nextCursor = result.moreDataAvailable ? result.nextCursor : undefined;
    }

    return {
      output: {
        items,
        nextCursor
      },
      message: `Found **${items.length}** ${resourceType.replace(/_/g, ' ')}${nextCursor ? ' (more available)' : ''}.`
    };
  })
  .build();

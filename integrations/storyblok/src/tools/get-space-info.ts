import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { errorData, own, resolveSpace, spaceIdInput } from '../lib/validation';
import { spec } from '../spec';

export const getSpaceInfo = SlateTool.create(spec, {
  name: 'Get Space Info',
  key: 'get_space_info',
  description:
    'Read an exact space and its available workflows, stages, custom roles and one page of tags. Permission failures omit unavailable collections and return a warning.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      spaceId: spaceIdInput,
      tagsPage: z.number().optional().describe('Tag page; default 1'),
      tagsPerPage: z.number().optional().describe('Tags per page; default 25, maximum 1000')
    })
  )
  .output(
    z.object({
      spaceId: z.number().optional(),
      name: z.string().optional(),
      domain: z.string().optional(),
      plan: z.string().optional(),
      createdAt: z.string().optional(),
      workflows: z
        .array(z.object({ workflowId: z.number().optional(), name: z.string().optional() }))
        .optional(),
      workflowStages: z
        .array(
          z.object({
            stageId: z.number().optional(),
            name: z.string().optional(),
            color: z.string().optional(),
            workflowId: z.number().optional()
          })
        )
        .optional(),
      roles: z
        .array(z.object({ roleId: z.number().optional(), name: z.string().optional() }))
        .optional(),
      tags: z
        .array(z.object({ name: z.string().optional(), count: z.number().optional() }))
        .optional(),
      tagsPage: z.number().optional(),
      tagsTotal: z.number().optional(),
      tagsNextPage: z.number().optional(),
      warnings: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new StoryblokClient({
      ...ctx.auth,
      spaceId: resolveSpace(
        ctx.input.spaceId,
        ctx.config.spaceId,
        ctx.auth.mode === 'oauth' ? ctx.auth.spaceId : undefined
      )
    });
    const space = await client.getSpace();
    const warnings: string[] = [];
    async function permitted<T>(
      label: string,
      request: () => Promise<T>
    ): Promise<T | undefined> {
      try {
        return await request();
      } catch (error) {
        if (own(errorData(error), 'upstreamStatus') !== 403) throw error;
        warnings.push(
          `${label} is unavailable with this credential or plan; the collection was omitted.`
        );
        return undefined;
      }
    }
    const workflows = await permitted('Workflows', () => client.listWorkflows());
    const stages = await permitted('Workflow stages', () => client.listWorkflowStages());
    const roles = await permitted('Space roles', () => client.listSpaceRoles());
    const tags = await permitted('Tags', () =>
      client.listTags({ page: ctx.input.tagsPage, perPage: ctx.input.tagsPerPage })
    );
    return {
      output: {
        spaceId: space.id,
        name: space.name,
        domain: space.domain,
        plan: space.plan,
        createdAt: space.created_at,
        workflows: workflows?.map(w => ({ workflowId: w.id, name: w.name })),
        workflowStages: stages?.map(s => ({
          stageId: s.id,
          name: s.name,
          color: s.color,
          workflowId: s.workflow_id
        })),
        roles: roles?.map(r => ({ roleId: r.id, name: r.role })),
        tags: tags?.tags.map(t => ({ name: t.name, count: t.taggings_count })),
        tagsPage: tags?.page,
        tagsTotal: tags?.total,
        tagsNextPage: tags?.nextPage,
        warnings: warnings.length ? warnings : undefined
      },
      message: 'Retrieved the exact space and available configuration data.'
    };
  })
  .build();

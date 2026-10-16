import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapGroup, optionalString, requireRecords } from '../lib/response';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listProjectGroups = SlateTool.create(spec, {
  name: 'List Project Groups',
  key: 'list_project_groups',
  description:
    'List the task groups within a project to discover group IDs before creating or moving tasks. Call list_projects to discover projects.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: projectIdSchema }))
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.string().describe('Task group ID'),
          groupName: z.string().describe('Name of the task group'),
          projectId: z.string().optional().describe('Parent project ID returned by Teamcamp')
        })
      ),
      raw: z.unknown().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let groups = await new Client(ctx.auth).getProjectGroups(ctx.input.projectId);
    return {
      output: {
        groups: requireRecords(groups).map(group => ({
          ...mapGroup(group),
          projectId: optionalString(group.projectId)
        })),
        raw: groups
      },
      message: `Retrieved project groups.`
    };
  })
  .build();

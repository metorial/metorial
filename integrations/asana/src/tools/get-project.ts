import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve full details for a project including members, followers, custom fields, and settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project GID')
    })
  )
  .output(
    z.object({
      projectId: z.string(),
      name: z.string(),
      archived: z.boolean().optional(),
      color: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      dueOn: z.string().nullable().optional(),
      startOn: z.string().nullable().optional(),
      modifiedAt: z.string().optional(),
      notes: z.string().optional(),
      defaultView: z.string().optional(),
      isPublic: z.boolean().optional(),
      owner: z.any().optional(),
      team: z.any().optional(),
      members: z.array(z.any()).optional(),
      followers: z.array(z.any()).optional(),
      customFields: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let p = await client.getProject(ctx.input.projectId);

    let output = {
      projectId: p.gid,
      name: p.name,
      archived: p.archived,
      color: p.color,
      createdAt: p.created_at,
      dueOn: p.due_on,
      startOn: p.start_on,
      modifiedAt: p.modified_at,
      notes: p.notes,
      defaultView: p.default_view,
      isPublic: p.public,
      owner: p.owner,
      team: p.team,
      members: p.members,
      followers: p.followers,
      customFields: p.custom_fields
    };

    return {
      output,
      message: `Retrieved project **${p.name}** (${p.gid}).`
    };
  })
  .build();

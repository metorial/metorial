import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFollowUps = SlateTool.create(spec, {
  name: 'List Follow-Ups',
  key: 'list_follow_ups',
  description: `List post-incident follow-up items (actions). Can filter by incident to show follow-ups for a specific incident, or list all follow-ups across the organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentId: z.string().optional().describe('Filter follow-ups by incident ID'),
      incidentMode: z
        .enum(['standard', 'retrospective', 'test', 'tutorial'])
        .optional()
        .describe('Filter by incident mode')
    })
  )
  .output(
    z.object({
      followUps: z.array(
        z.object({
          followUpId: z.string(),
          title: z.string().optional(),
          status: z.string().optional(),
          priority: z.any().optional(),
          incidentId: z.string().optional(),
          assignee: z.any().optional(),
          completedAt: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFollowUps({
      incidentId: ctx.input.incidentId,
      incidentMode: ctx.input.incidentMode
    });

    let followUps = result.follow_ups.map((f: any) => ({
      followUpId: f.id,
      title: f.title || undefined,
      status: f.status || undefined,
      priority: f.priority || undefined,
      incidentId: f.incident_id || undefined,
      assignee: f.assignee || undefined,
      completedAt: f.completed_at || undefined,
      createdAt: f.created_at || undefined,
      updatedAt: f.updated_at || undefined
    }));

    return {
      output: { followUps },
      message: `Found **${followUps.length}** follow-up(s).`
    };
  })
  .build();

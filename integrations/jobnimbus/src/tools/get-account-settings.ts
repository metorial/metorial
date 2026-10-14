import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountSettings = SlateTool.create(spec, {
  name: 'Get Account Settings',
  key: 'get_account_settings',
  description:
    'Discover configured contact and job workflows, statuses, task types, activity types, and lead sources before creating records.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      workflows: z.array(
        z.object({
          id: z.number(),
          name: z.string(),
          objectType: z.string().optional(),
          isActive: z.boolean().optional(),
          statuses: z.array(
            z.object({ id: z.number(), name: z.string(), isActive: z.boolean().optional() })
          )
        })
      ),
      taskTypes: z.array(
        z.object({ id: z.number(), name: z.string(), isActive: z.boolean().optional() })
      ),
      activityTypes: z.array(
        z.object({ id: z.number(), name: z.string(), isActive: z.boolean().optional() })
      ),
      leadSources: z.array(
        z.object({ id: z.number(), name: z.string(), isActive: z.boolean().optional() })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let settings = await client.getAccountSettings();
    return {
      output: {
        workflows: (settings.workflows ?? []).map((workflow: any) => ({
          id: workflow.id,
          name: workflow.name,
          objectType: workflow.object_type ?? undefined,
          isActive: workflow.is_active ?? undefined,
          statuses: (workflow.status ?? []).map((status: any) => ({
            id: status.id,
            name: status.name,
            isActive: status.is_active ?? undefined
          }))
        })),
        taskTypes: (settings.taskTypes ?? []).map((type: any) => ({
          id: type.TaskTypeId,
          name: type.TypeName,
          isActive: type.IsActive ?? undefined
        })),
        activityTypes: (settings.activityTypes ?? []).map((type: any) => ({
          id: type.ActivityTypeId,
          name: type.TypeName,
          isActive: type.IsActive ?? undefined
        })),
        leadSources: (settings.sources ?? []).map((source: any) => ({
          id: source.JobSourceId,
          name: source.SourceName,
          isActive: source.IsActive ?? undefined
        }))
      },
      message:
        'Retrieved JobNimbus workflows, statuses, task types, activity types, and lead sources.'
    };
  })
  .build();

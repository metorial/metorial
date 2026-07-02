import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGroups = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List all permission groups in the Retool organization. Groups are the primary mechanism for assigning permissions to users.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      groups: z.array(
        z.object({
          groupId: z.number(),
          groupName: z.string(),
          universalAppAccess: z.string().optional(),
          universalResourceAccess: z.string().optional(),
          universalWorkflowAccess: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.listGroups();

    let groups = result.data.map(g => ({
      groupId: g.id,
      groupName: g.name,
      universalAppAccess: g.universal_app_access,
      universalResourceAccess: g.universal_resource_access,
      universalWorkflowAccess: g.universal_workflow_access
    }));

    return {
      output: {
        groups,
        totalCount: result.total_count
      },
      message: `Found **${result.total_count}** permission groups.`
    };
  })
  .build();

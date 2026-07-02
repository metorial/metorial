import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listResourcesTool = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `Retrieve resources, services, and groups for a specific schedule, or list user groups in the account. Also supports fetching available fields for a schedule or user object.`,
  constraints: ['Resource listing is not available for capacity-type schedules.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleId: z.string().optional().describe('Schedule ID to list resources/services for'),
      includeFields: z
        .boolean()
        .optional()
        .describe('If true, also returns the configured field list for the schedule'),
      includeGroups: z
        .boolean()
        .optional()
        .describe('If true, also returns user groups in the account')
    })
  )
  .output(
    z.object({
      resources: z
        .array(
          z.object({
            resourceId: z.string().describe('Resource or service ID'),
            resourceName: z.string().describe('Resource or service name')
          })
        )
        .optional()
        .describe('Resources or services for the schedule'),
      fields: z
        .array(z.any())
        .optional()
        .describe('Available fields configured for the schedule'),
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Group ID'),
            groupName: z.string().describe('Group name')
          })
        )
        .optional()
        .describe('User groups in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let output: any = {};
    let parts: string[] = [];

    if (ctx.input.scheduleId) {
      let data = await client.listResources(ctx.input.scheduleId);
      output.resources = Array.isArray(data)
        ? data.map((item: any) => ({
            resourceId: String(item.id ?? item[0] ?? ''),
            resourceName: String(item.name ?? item[1] ?? '')
          }))
        : [];
      parts.push(`**${output.resources.length}** resource(s)`);
    }

    if (ctx.input.includeFields) {
      output.fields = await client.getFieldList(ctx.input.scheduleId);
      parts.push(`field list`);
    }

    if (ctx.input.includeGroups) {
      let data = await client.listGroups();
      output.groups = Array.isArray(data)
        ? data.map((item: any) => ({
            groupId: String(item.id ?? item[0] ?? ''),
            groupName: String(item.name ?? item[1] ?? '')
          }))
        : [];
      parts.push(`**${output.groups.length}** group(s)`);
    }

    return {
      output,
      message:
        parts.length > 0
          ? `Retrieved ${parts.join(', ')}.`
          : 'No data requested. Provide a scheduleId or enable includeFields/includeGroups.'
    };
  })
  .build();

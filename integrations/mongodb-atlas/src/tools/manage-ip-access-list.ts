import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import {
  invalidAction,
  requireNonEmptyArray,
  requireString,
  resolveProjectId
} from '../lib/validation';
import { spec } from '../spec';

export let manageIpAccessListTool = SlateTool.create(spec, {
  name: 'Manage IP Access List',
  key: 'manage_ip_access_list',
  description: `Manage the IP access list (whitelist) that controls which IP addresses can connect to Atlas clusters in a project. Add, list, or remove IP addresses, CIDR blocks, or AWS security groups.`,
  instructions: [
    'Use "0.0.0.0/0" to allow access from anywhere (not recommended for production).',
    'Use CIDR notation for IP ranges (e.g., "192.168.1.0/24").',
    'AWS security group IDs can be used for VPC peered connections.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      entries: z
        .array(
          z.object({
            ipAddress: z
              .string()
              .optional()
              .describe('IP address to allow (e.g., "192.168.1.1")'),
            cidrBlock: z
              .string()
              .optional()
              .describe('CIDR block to allow (e.g., "192.168.1.0/24")'),
            awsSecurityGroup: z.string().optional().describe('AWS security group ID'),
            comment: z.string().optional().describe('Description of this entry'),
            deleteAfterDate: z
              .string()
              .optional()
              .describe('ISO 8601 date to auto-remove this entry')
          })
        )
        .optional()
        .describe('IP access list entries to add'),
      entryValue: z.string().optional().describe('IP address, CIDR block, or AWS SG to remove')
    })
  )
  .output(
    z.object({
      entries: z
        .array(
          z.object({
            ipAddress: z.string().optional(),
            cidrBlock: z.string().optional(),
            awsSecurityGroup: z.string().optional(),
            comment: z.string().optional(),
            deleteAfterDate: z.string().optional(),
            groupId: z.string().optional()
          })
        )
        .optional(),
      totalCount: z.number().optional(),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listIpAccessList(projectId);
      let entries = result.results || [];
      return {
        output: { entries, totalCount: result.totalCount || entries.length },
        message: `Found **${entries.length}** IP access list entries.`
      };
    }

    if (action === 'add') {
      let requestedEntries = requireNonEmptyArray(
        ctx.input.entries,
        'entries',
        'for the add action'
      );
      let result = await client.addIpAccessListEntries(projectId, requestedEntries);
      let entries = result.results || [];
      return {
        output: { entries, totalCount: entries.length },
        message: `Added **${requestedEntries.length}** IP access list entry/entries.`
      };
    }

    if (action === 'remove') {
      let entryValue = requireString(
        ctx.input.entryValue,
        'entryValue',
        'for the remove action'
      );
      await client.deleteIpAccessListEntry(projectId, entryValue);
      return {
        output: { removed: true },
        message: `Removed IP access list entry **${entryValue}**.`
      };
    }

    return invalidAction(action);
  })
  .build();

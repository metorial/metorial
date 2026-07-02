import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

let accessListEntrySchema = z.object({
  ipAddress: z.string().optional().describe('IP address in the access list'),
  cidrBlock: z.string().optional().describe('CIDR block in the access list'),
  awsSecurityGroup: z.string().optional().describe('AWS Security Group ID'),
  comment: z.string().optional().describe('Comment associated with the entry'),
  deleteAfterDate: z.string().optional().describe('ISO 8601 timestamp when the entry expires'),
  groupId: z.string().optional().describe('Project ID')
});

export let manageIpAccessListTool = SlateTool.create(spec, {
  name: 'Manage IP Access List',
  key: 'manage_ip_access_list',
  description: `List, add, or remove IP addresses and CIDR blocks from a project's IP access list. The IP access list controls which IP addresses can connect to your Atlas clusters. You can also add temporary entries with expiration dates.`,
  instructions: [
    'Provide either ipAddress, cidrBlock, or awsSecurityGroup when adding entries.',
    'Use "0.0.0.0/0" to allow access from anywhere (not recommended for production).',
    'For delete, provide the exact IP address or CIDR block to remove.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'delete']).describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      entries: z
        .array(
          z.object({
            ipAddress: z.string().optional().describe('Single IP address to allow'),
            cidrBlock: z
              .string()
              .optional()
              .describe('CIDR block to allow (e.g., "192.168.1.0/24")'),
            awsSecurityGroup: z.string().optional().describe('AWS Security Group ID'),
            comment: z.string().optional().describe('Comment for this entry'),
            deleteAfterDate: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp to auto-remove the entry')
          })
        )
        .optional()
        .describe('Entries to add (for add action)'),
      entryValue: z
        .string()
        .optional()
        .describe('IP address or CIDR block to remove (for delete action)')
    })
  )
  .output(
    z.object({
      entries: z
        .array(accessListEntrySchema)
        .optional()
        .describe('Current access list entries'),
      totalCount: z.number().optional().describe('Total number of entries'),
      deleted: z.boolean().optional().describe('Whether the entry was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list') {
      let result = await client.listIpAccessList(projectId);
      let entries = (result.results || []).map((e: any) => ({
        ipAddress: e.ipAddress,
        cidrBlock: e.cidrBlock,
        awsSecurityGroup: e.awsSecurityGroup,
        comment: e.comment,
        deleteAfterDate: e.deleteAfterDate,
        groupId: e.groupId
      }));
      return {
        output: { entries, totalCount: result.totalCount ?? entries.length },
        message: `Found **${entries.length}** IP access list entries.`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.entries || ctx.input.entries.length === 0)
        throw new Error('At least one entry is required');
      let result = await client.addIpAccessListEntries(projectId, ctx.input.entries);
      let entries = (result.results || []).map((e: any) => ({
        ipAddress: e.ipAddress,
        cidrBlock: e.cidrBlock,
        awsSecurityGroup: e.awsSecurityGroup,
        comment: e.comment,
        deleteAfterDate: e.deleteAfterDate,
        groupId: e.groupId
      }));
      return {
        output: { entries, totalCount: result.totalCount ?? entries.length },
        message: `Added **${ctx.input.entries.length}** entry/entries to the IP access list.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.entryValue) throw new Error('entryValue is required for delete action');
      await client.deleteIpAccessListEntry(projectId, ctx.input.entryValue);
      return {
        output: { deleted: true },
        message: `Removed **${ctx.input.entryValue}** from the IP access list.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();

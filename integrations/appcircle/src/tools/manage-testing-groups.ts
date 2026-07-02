import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTestingGroups = SlateTool.create(spec, {
  name: 'Manage Testing Groups',
  key: 'manage_testing_groups',
  description: `Manage testing groups used for distributing app builds to testers. Supports listing, creating, deleting groups and managing group members.`,
  instructions: [
    'Use action "list" to list all testing groups.',
    'Use action "get" to get details of a specific testing group.',
    'Use action "create" to create a new testing group.',
    'Use action "delete" to delete a testing group.',
    'Use action "add_testers" to add tester emails to a group.',
    'Use action "remove_testers" to remove testers from a group.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'add_testers', 'remove_testers'])
        .describe('The operation to perform'),
      groupId: z
        .string()
        .optional()
        .describe('ID of the testing group (required for group-specific operations)'),
      groupName: z.string().optional().describe('Name for the testing group (create)'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Tester email addresses (add_testers, remove_testers)')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list': {
        let groups = await client.listTestingGroups();
        let items = Array.isArray(groups) ? groups : [];
        return { output: items, message: `Found **${items.length}** testing group(s).` };
      }
      case 'get': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        let group = await client.getTestingGroup(ctx.input.groupId);
        return { output: group, message: `Retrieved testing group **${ctx.input.groupId}**.` };
      }
      case 'create': {
        if (!ctx.input.groupName) throw new Error('groupName is required');
        let created = await client.createTestingGroup({ name: ctx.input.groupName });
        return {
          output: created,
          message: `Created testing group **${ctx.input.groupName}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.groupId) throw new Error('groupId is required');
        await client.deleteTestingGroup(ctx.input.groupId);
        return {
          output: { success: true },
          message: `Deleted testing group **${ctx.input.groupId}**.`
        };
      }
      case 'add_testers': {
        if (!ctx.input.groupId || !ctx.input.emails?.length)
          throw new Error('groupId and emails are required');
        let result = await client.addTestersToGroup(ctx.input.groupId, ctx.input.emails);
        return {
          output: result,
          message: `Added **${ctx.input.emails.length}** tester(s) to group.`
        };
      }
      case 'remove_testers': {
        if (!ctx.input.groupId || !ctx.input.emails?.length)
          throw new Error('groupId and emails are required');
        await client.removeTestersFromGroup(ctx.input.groupId, ctx.input.emails);
        return {
          output: { success: true },
          message: `Removed **${ctx.input.emails.length}** tester(s) from group.`
        };
      }
    }
  })
  .build();

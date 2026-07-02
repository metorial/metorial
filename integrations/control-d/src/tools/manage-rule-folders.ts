import { SlateTool } from 'slates';
import { z } from 'zod';
import { actionDescription, createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRuleFolders = SlateTool.create(spec, {
  name: 'Manage Rule Folders',
  key: 'manage_rule_folders',
  description: `Create, list, update, or delete custom rule folders on a profile. Folders organize custom DNS rules and apply a shared action (block, bypass, spoof, redirect) to all rules within them.`,
  instructions: ['Deleting a folder permanently removes all custom rules inside it.'],
  constraints: ['Deleting a folder is irreversible and removes all rules within it.']
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      profileId: z.string().describe('Profile ID'),
      folderId: z.string().optional().describe('Folder ID (required for update and delete)'),
      name: z.string().optional().describe('Folder name (required for create)'),
      action: z.number().optional().describe('Action: 0=Block, 1=Bypass, 2=Spoof, 3=Redirect'),
      enabled: z.boolean().optional().describe('Enable or disable the folder'),
      via: z.string().optional().describe('Target for Spoof/Redirect action')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderId: z.number().describe('Folder identifier'),
          name: z.string().describe('Folder name'),
          action: z.string().describe('Applied action description'),
          enabled: z.boolean().describe('Whether the folder is enabled'),
          ruleCount: z.number().describe('Number of rules in folder')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { operation, profileId, folderId, name, action, enabled, via } = ctx.input;

    if (operation === 'create') {
      if (!name) throw new Error('name is required for create');
      if (action === undefined) throw new Error('action is required for create');
      let folder = await client.createRuleFolder(profileId, {
        name,
        action,
        status: enabled !== false ? 1 : 0,
        via
      });
      return {
        output: {
          folders: [
            {
              folderId: folder.PK,
              name: folder.group,
              action: actionDescription(folder.action.do, folder.action.via),
              enabled: folder.action.status === 1,
              ruleCount: folder.count
            }
          ]
        },
        message: `Created folder **${name}** with action **${actionDescription(action, via)}**.`
      };
    }

    if (operation === 'update') {
      if (!folderId) throw new Error('folderId is required for update');
      if (action === undefined) throw new Error('action is required for update');
      let folder = await client.modifyRuleFolder(profileId, folderId, {
        name,
        action,
        status: enabled !== false ? 1 : 0,
        via
      });
      return {
        output: {
          folders: [
            {
              folderId: folder.PK,
              name: folder.group,
              action: actionDescription(folder.action.do, folder.action.via),
              enabled: folder.action.status === 1,
              ruleCount: folder.count
            }
          ]
        },
        message: `Updated folder **${folderId}**${name ? ` (renamed to "${name}")` : ''}.`
      };
    }

    if (operation === 'delete') {
      if (!folderId) throw new Error('folderId is required for delete');
      await client.deleteRuleFolder(profileId, folderId);
      return {
        output: { folders: [] },
        message: `Deleted folder **${folderId}** and all rules within it.`
      };
    }

    // list
    let folders = await client.listRuleFolders(profileId);
    return {
      output: {
        folders: folders.map(f => ({
          folderId: f.PK,
          name: f.group,
          action: actionDescription(f.action.do, f.action.via),
          enabled: f.action.status === 1,
          ruleCount: f.count
        }))
      },
      message: `Found **${folders.length}** folder(s) on profile ${profileId}.`
    };
  })
  .build();

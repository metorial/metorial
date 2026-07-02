import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebLink = SlateTool.create(spec, {
  name: 'Manage Web Link',
  key: 'manage_web_link',
  description: `Create, view, update, or delete web link bookmarks within Box folders. Web links are bookmarks to external URLs stored alongside files and folders.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('The web link operation to perform'),
      webLinkId: z
        .string()
        .optional()
        .describe('Web link ID (required for get, update, delete)'),
      url: z
        .string()
        .optional()
        .describe('URL for the web link (required for create, optional for update)'),
      parentFolderId: z.string().optional().describe('Parent folder ID (required for create)'),
      name: z.string().optional().describe('Display name for the web link'),
      description: z.string().optional().describe('Description of the web link')
    })
  )
  .output(
    z.object({
      webLinkId: z.string().optional().describe('ID of the web link'),
      url: z.string().optional().describe('URL of the web link'),
      name: z.string().optional().describe('Display name'),
      description: z.string().optional().describe('Description'),
      parentFolderId: z.string().optional().describe('Parent folder ID'),
      deleted: z.boolean().optional().describe('True if the web link was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, webLinkId, url, parentFolderId, name, description } = ctx.input;

    if (action === 'create') {
      if (!url) throw new Error('url is required for create action');
      if (!parentFolderId) throw new Error('parentFolderId is required for create action');
      let wl = await client.createWebLink(url, parentFolderId, name, description);
      return {
        output: {
          webLinkId: wl.id,
          url: wl.url,
          name: wl.name,
          description: wl.description,
          parentFolderId: wl.parent?.id
        },
        message: `Created web link **${wl.name || url}** in folder ${parentFolderId}.`
      };
    }

    if (!webLinkId) throw new Error('webLinkId is required for this action');

    if (action === 'get') {
      let wl = await client.getWebLink(webLinkId);
      return {
        output: {
          webLinkId: wl.id,
          url: wl.url,
          name: wl.name,
          description: wl.description,
          parentFolderId: wl.parent?.id
        },
        message: `Retrieved web link **${wl.name || wl.url}** (${wl.id}).`
      };
    }

    if (action === 'update') {
      let updates: Record<string, any> = {};
      if (url) updates.url = url;
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      let wl = await client.updateWebLink(webLinkId, updates);
      return {
        output: {
          webLinkId: wl.id,
          url: wl.url,
          name: wl.name,
          description: wl.description,
          parentFolderId: wl.parent?.id
        },
        message: `Updated web link **${wl.name || wl.url}**.`
      };
    }

    // delete
    await client.deleteWebLink(webLinkId);
    return {
      output: { webLinkId, deleted: true },
      message: `Deleted web link ${webLinkId}.`
    };
  });

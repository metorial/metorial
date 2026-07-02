import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

export let createLinkTool = SlateTool.create(spec, {
  name: 'Create Sharing Link',
  key: 'create_link',
  description: `Create a sharing link for a file or folder in Egnyte. Links can be configured with access controls, expiry settings, password protection, and email notifications. Supports file download links, folder links, and upload links.`
})
  .input(
    z.object({
      path: z.string().describe('Path to the file or folder to share'),
      type: z
        .enum(['file', 'folder', 'upload'])
        .describe('Type of link: file download, folder access, or upload link'),
      accessibility: z
        .enum(['anyone', 'password', 'domain', 'recipients'])
        .describe(
          '"anyone" for public, "password" for password-protected, "domain" for domain users only, "recipients" for specific recipients'
        ),
      recipients: z
        .array(z.string())
        .optional()
        .describe(
          'Email addresses of recipients (required when accessibility is "recipients")'
        ),
      sendEmail: z
        .boolean()
        .optional()
        .describe('Whether to send email notifications to recipients'),
      message: z
        .string()
        .optional()
        .describe('Custom message to include in the email notification'),
      notify: z
        .boolean()
        .optional()
        .describe('Whether to notify the link creator when the link is accessed'),
      expiryDate: z.string().optional().describe('Expiry date for the link (ISO 8601 format)'),
      expiryClicks: z
        .number()
        .optional()
        .describe('Number of clicks after which the link expires'),
      password: z.string().optional().describe('Password for password-protected links'),
      linkToCurrent: z
        .boolean()
        .optional()
        .describe('If true, link points to the current file version only')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Unique identifier for the link'),
      url: z.string().describe('The sharing URL'),
      path: z.string().describe('Path to the shared item'),
      type: z.string().describe('Link type'),
      accessibility: z.string().describe('Access level'),
      creationDate: z.string().optional().describe('When the link was created'),
      expiryDate: z.string().optional().describe('When the link expires'),
      expiryClicks: z.number().optional().describe('Click-based expiry count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.createLink({
      path: ctx.input.path,
      type: ctx.input.type,
      accessibility: ctx.input.accessibility,
      recipients: ctx.input.recipients,
      sendEmail: ctx.input.sendEmail,
      message: ctx.input.message,
      notify: ctx.input.notify,
      expiryDate: ctx.input.expiryDate,
      expiryClicks: ctx.input.expiryClicks,
      password: ctx.input.password,
      linkToCurrent: ctx.input.linkToCurrent
    })) as Record<string, unknown>;

    let links = Array.isArray(result.links)
      ? (result.links[0] as Record<string, unknown>)
      : result;

    return {
      output: {
        linkId: String(links.id || ''),
        url: String(links.url || ''),
        path: String(links.path || ctx.input.path),
        type: String(links.type || ctx.input.type),
        accessibility: String(links.accessibility || ctx.input.accessibility),
        creationDate: links.creation_date ? String(links.creation_date) : undefined,
        expiryDate: links.expiry_date ? String(links.expiry_date) : undefined,
        expiryClicks: typeof links.expiry_clicks === 'number' ? links.expiry_clicks : undefined
      },
      message: `Created ${ctx.input.type} link for **${ctx.input.path}** — [${links.url}](${links.url})`
    };
  })
  .build();

export let listLinksTool = SlateTool.create(spec, {
  name: 'List Sharing Links',
  key: 'list_links',
  description: `List sharing links in Egnyte. Filter by path, creator, date range, type, or accessibility level. Non-admin users can only see links they created.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      path: z.string().optional().describe('Filter links by path prefix'),
      username: z.string().optional().describe('Filter by link creator username'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter links created before this date (ISO 8601)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter links created after this date (ISO 8601)'),
      type: z.enum(['file', 'folder', 'upload']).optional().describe('Filter by link type'),
      accessibility: z
        .enum(['anyone', 'password', 'domain', 'recipients'])
        .optional()
        .describe('Filter by accessibility level'),
      offset: z.number().optional().describe('Pagination offset'),
      count: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      links: z
        .array(
          z.object({
            linkId: z.string(),
            url: z.string(),
            path: z.string(),
            type: z.string(),
            accessibility: z.string(),
            creationDate: z.string().optional(),
            createdBy: z.string().optional()
          })
        )
        .describe('List of sharing links'),
      totalCount: z.number().optional().describe('Total number of matching links'),
      offset: z.number().optional(),
      count: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.listLinks({
      path: ctx.input.path,
      username: ctx.input.username,
      createdBefore: ctx.input.createdBefore,
      createdAfter: ctx.input.createdAfter,
      type: ctx.input.type,
      accessibility: ctx.input.accessibility,
      offset: ctx.input.offset,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let rawLinks = Array.isArray(result.links) ? result.links : [];
    let links = rawLinks.map((l: Record<string, unknown>) => ({
      linkId: String(l.id || ''),
      url: String(l.url || ''),
      path: String(l.path || ''),
      type: String(l.type || ''),
      accessibility: String(l.accessibility || ''),
      creationDate: l.creation_date ? String(l.creation_date) : undefined,
      createdBy: l.created_by ? String(l.created_by) : undefined
    }));

    return {
      output: {
        links,
        totalCount: typeof result.total_count === 'number' ? result.total_count : undefined,
        offset: typeof result.offset === 'number' ? result.offset : undefined,
        count: typeof result.count === 'number' ? result.count : undefined
      },
      message: `Found **${links.length}** sharing link(s)${ctx.input.path ? ` for path ${ctx.input.path}` : ''}`
    };
  })
  .build();

export let deleteLinkTool = SlateTool.create(spec, {
  name: 'Delete Sharing Link',
  key: 'delete_link',
  description: `Delete a sharing link in Egnyte. The shared URL will immediately stop working.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      linkId: z.string().describe('ID of the link to delete')
    })
  )
  .output(
    z.object({
      linkId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.deleteLink(ctx.input.linkId);

    return {
      output: {
        linkId: ctx.input.linkId,
        deleted: true
      },
      message: `Deleted sharing link **${ctx.input.linkId}**`
    };
  })
  .build();

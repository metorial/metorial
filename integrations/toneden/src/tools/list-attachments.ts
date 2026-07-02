import { SlateTool } from 'slates';
import { z } from 'zod';
import { ToneDenClient } from '../lib/client';
import { spec } from '../spec';

let attachmentSummarySchema = z.object({
  attachmentId: z.number().describe('Unique attachment ID'),
  ownerId: z.number().optional().describe('Owner user ID'),
  type: z.string().describe('Attachment type (unlock or contest)'),
  title: z.string().optional().describe('Attachment title'),
  artworkUrl: z.string().optional().describe('Artwork URL'),
  linkPath: z.string().optional().describe('URL path'),
  isPrivate: z.boolean().optional().describe('Whether the attachment is private'),
  isHidden: z.boolean().optional().describe('Whether the attachment is hidden'),
  actions: z.number().optional().describe('Number of actions/entries')
});

export let listAttachments = SlateTool.create(spec, {
  name: 'List Attachments',
  key: 'list_attachments',
  description: `List all social unlocks or contests for the authenticated user profile. The attachment type (unlock or contest) is required to filter results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      attachmentType: z.enum(['unlock', 'contest']).describe('Type of attachment to list'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      attachments: z.array(attachmentSummarySchema).describe('List of attachments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ToneDenClient({ token: ctx.auth.token });
    let attachments = await client.listAttachments('me', {
      type: ctx.input.attachmentType,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let mapped = (attachments || []).map((a: any) => ({
      attachmentId: a.id,
      ownerId: a.owner_id,
      type: a.type,
      title: a.title,
      artworkUrl: a.artwork_url,
      linkPath: a.link_path,
      isPrivate: a.is_private,
      isHidden: a.is_hidden,
      actions: a.actions
    }));

    return {
      output: { attachments: mapped },
      message: `Found **${mapped.length}** ${ctx.input.attachmentType}(s).`
    };
  })
  .build();

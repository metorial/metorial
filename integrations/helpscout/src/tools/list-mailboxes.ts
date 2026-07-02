import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let listMailboxes = SlateTool.create(spec, {
  name: 'List Mailboxes',
  key: 'list_mailboxes',
  description: `List all mailboxes (shared inboxes) in the Help Scout account. Optionally retrieve folders and custom fields for a specific mailbox.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      mailboxId: z
        .number()
        .optional()
        .describe('Get details for a specific mailbox, including folders and custom fields'),
      page: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      mailboxes: z
        .array(
          z.object({
            mailboxId: z.number().describe('Mailbox ID'),
            name: z.string().describe('Mailbox name'),
            slug: z.string().optional().describe('Mailbox slug'),
            email: z.string().optional().describe('Mailbox email address'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            modifiedAt: z.string().optional().describe('Last modified timestamp')
          })
        )
        .optional()
        .describe('List of mailboxes (when no specific mailboxId is provided)'),
      mailbox: z
        .object({
          mailboxId: z.number(),
          name: z.string(),
          slug: z.string().optional(),
          email: z.string().optional(),
          folders: z
            .array(
              z.object({
                folderId: z.number(),
                name: z.string(),
                type: z.string().optional(),
                totalCount: z.number().optional(),
                activeCount: z.number().optional()
              })
            )
            .optional(),
          customFields: z
            .array(
              z.object({
                fieldId: z.number(),
                name: z.string(),
                type: z.string(),
                required: z.boolean().optional(),
                options: z.array(z.string()).optional()
              })
            )
            .optional()
        })
        .optional()
        .describe('Detailed mailbox info (when mailboxId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.mailboxId) {
      let data = await client.getMailbox(ctx.input.mailboxId);
      let foldersData = await client.listMailboxFolders(ctx.input.mailboxId);
      let fieldsData = await client.listMailboxCustomFields(ctx.input.mailboxId);

      let folders = (foldersData?._embedded?.folders ?? []).map((f: any) => ({
        folderId: f.id,
        name: f.name,
        type: f.type,
        totalCount: f.totalCount,
        activeCount: f.activeCount
      }));

      let customFields = (fieldsData?._embedded?.fields ?? []).map((f: any) => ({
        fieldId: f.id,
        name: f.name,
        type: f.type,
        required: f.required,
        options: f.options ?? undefined
      }));

      return {
        output: {
          mailbox: {
            mailboxId: data.id,
            name: data.name,
            slug: data.slug,
            email: data.email,
            folders,
            customFields
          }
        },
        message: `Mailbox **${data.name}** — ${folders.length} folders, ${customFields.length} custom fields.`
      };
    }

    let data = await client.listMailboxes({ page: ctx.input.page });
    let embedded = data?._embedded?.mailboxes ?? [];

    let mailboxes = embedded.map((m: any) => ({
      mailboxId: m.id,
      name: m.name,
      slug: m.slug,
      email: m.email,
      createdAt: m.createdAt,
      modifiedAt: m.updatedAt
    }));

    return {
      output: { mailboxes },
      message: `Found **${mailboxes.length}** mailboxes.`
    };
  })
  .build();

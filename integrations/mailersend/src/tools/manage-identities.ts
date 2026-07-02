import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIdentities = SlateTool.create(spec, {
  name: 'List Sender Identities',
  key: 'list_identities',
  description: `Retrieve a paginated list of sender identities. Optionally filter by domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().optional().describe('Filter identities by domain ID.'),
      page: z.number().optional().describe('Page number for pagination.'),
      limit: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Results per page (10-100, default 25).')
    })
  )
  .output(
    z.object({
      identities: z
        .array(
          z.object({
            identityId: z.string().describe('Identity ID.'),
            email: z.string().describe('Sender email address.'),
            name: z.string().describe('Sender display name.'),
            isVerified: z.boolean().describe('Whether the identity is verified.'),
            createdAt: z.string().describe('Creation timestamp.')
          })
        )
        .describe('List of sender identities.'),
      total: z.number().describe('Total number of identities.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listIdentities({
      domainId: ctx.input.domainId,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let identities = (result.data || []).map((i: Record<string, unknown>) => ({
      identityId: String(i.id || ''),
      email: String(i.email || ''),
      name: String(i.name || ''),
      isVerified: Boolean(i.is_verified),
      createdAt: String(i.created_at || '')
    }));

    let total =
      ((result.meta as Record<string, unknown>)?.total as number) ?? identities.length;

    return {
      output: { identities, total },
      message: `Found **${total}** sender identities.`
    };
  })
  .build();

export let createIdentity = SlateTool.create(spec, {
  name: 'Create Sender Identity',
  key: 'create_identity',
  description: `Create a new sender identity (verified "From" address) for a domain. The identity must be verified before it can be used to send emails.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      domainId: z.string().describe('ID of the domain to create the identity for.'),
      email: z.string().describe('Sender email address (must be unique, max 191 characters).'),
      name: z.string().describe('Sender display name (max 191 characters).'),
      replyToEmail: z.string().optional().describe('Reply-to email address.'),
      replyToName: z.string().optional().describe('Reply-to display name.'),
      addNote: z.boolean().optional().describe('Whether to include a personal note.'),
      personalNote: z.string().optional().describe('Personal note text (max 250 characters).')
    })
  )
  .output(
    z.object({
      identityId: z.string().describe('ID of the created identity.'),
      email: z.string().describe('Sender email address.'),
      name: z.string().describe('Sender display name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createIdentity({
      domainId: ctx.input.domainId,
      email: ctx.input.email,
      name: ctx.input.name,
      replyToEmail: ctx.input.replyToEmail,
      replyToName: ctx.input.replyToName,
      addNote: ctx.input.addNote,
      personalNote: ctx.input.personalNote
    });

    let i = result.data;

    return {
      output: {
        identityId: String(i.id || ''),
        email: String(i.email || ''),
        name: String(i.name || '')
      },
      message: `Sender identity **${i.name}** <${i.email}> created successfully.`
    };
  })
  .build();

export let updateIdentity = SlateTool.create(spec, {
  name: 'Update Sender Identity',
  key: 'update_identity',
  description: `Update an existing sender identity's display name, reply-to address, or personal note.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      identityId: z.string().describe('ID of the identity to update.'),
      name: z.string().optional().describe('Updated display name.'),
      replyToEmail: z.string().optional().describe('Updated reply-to email address.'),
      replyToName: z.string().optional().describe('Updated reply-to display name.'),
      addNote: z.boolean().optional().describe('Whether to include a personal note.'),
      personalNote: z
        .string()
        .optional()
        .describe('Updated personal note text (max 250 characters).')
    })
  )
  .output(
    z.object({
      identityId: z.string().describe('ID of the updated identity.'),
      email: z.string().describe('Sender email address.'),
      name: z.string().describe('Updated display name.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateIdentity(ctx.input.identityId, {
      name: ctx.input.name,
      replyToEmail: ctx.input.replyToEmail,
      replyToName: ctx.input.replyToName,
      addNote: ctx.input.addNote,
      personalNote: ctx.input.personalNote
    });

    let i = result.data;

    return {
      output: {
        identityId: String(i.id || ''),
        email: String(i.email || ''),
        name: String(i.name || '')
      },
      message: `Sender identity \`${i.id}\` updated successfully.`
    };
  })
  .build();

export let deleteIdentity = SlateTool.create(spec, {
  name: 'Delete Sender Identity',
  key: 'delete_identity',
  description: `Permanently delete a sender identity. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      identityId: z.string().describe('ID of the identity to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the identity was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteIdentity(ctx.input.identityId);

    return {
      output: { deleted: true },
      message: `Sender identity \`${ctx.input.identityId}\` deleted successfully.`
    };
  })
  .build();

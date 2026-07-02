import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let addRecipient = SlateTool.create(spec, {
  name: 'Add Recipient',
  key: 'add_recipient',
  description: `Add a new recipient (CC) to an existing PandaDoc document. Works on documents in any status.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document'),
      email: z.string().describe('Recipient email address'),
      firstName: z.string().optional().describe('Recipient first name'),
      lastName: z.string().optional().describe('Recipient last name')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('UUID of the added recipient'),
      email: z.string().describe('Recipient email'),
      firstName: z.string().optional().describe('Recipient first name'),
      lastName: z.string().optional().describe('Recipient last name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.addRecipient(ctx.input.documentId, {
      email: ctx.input.email,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName
    });

    return {
      output: {
        recipientId: result.id,
        email: result.email || ctx.input.email,
        firstName: result.first_name || ctx.input.firstName,
        lastName: result.last_name || ctx.input.lastName
      },
      message: `Added recipient **${ctx.input.email}** to document \`${ctx.input.documentId}\`.`
    };
  })
  .build();

export let updateRecipient = SlateTool.create(spec, {
  name: 'Update Recipient',
  key: 'update_recipient',
  description: `Update an existing recipient's details on a PandaDoc document.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document'),
      recipientId: z.string().describe('UUID of the recipient to update'),
      email: z.string().optional().describe('New email address'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('UUID of the updated recipient'),
      email: z.string().optional().describe('Recipient email'),
      firstName: z.string().optional().describe('Recipient first name'),
      lastName: z.string().optional().describe('Recipient last name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let updateParams: any = {};
    if (ctx.input.email) updateParams.email = ctx.input.email;
    if (ctx.input.firstName) updateParams.first_name = ctx.input.firstName;
    if (ctx.input.lastName) updateParams.last_name = ctx.input.lastName;

    let result = await client.updateRecipient(
      ctx.input.documentId,
      ctx.input.recipientId,
      updateParams
    );

    return {
      output: {
        recipientId: result.id || ctx.input.recipientId,
        email: result.email || ctx.input.email,
        firstName: result.first_name || ctx.input.firstName,
        lastName: result.last_name || ctx.input.lastName
      },
      message: `Updated recipient \`${ctx.input.recipientId}\` on document \`${ctx.input.documentId}\`.`
    };
  })
  .build();

export let removeRecipient = SlateTool.create(spec, {
  name: 'Remove Recipient',
  key: 'remove_recipient',
  description: `Remove a recipient from a PandaDoc document.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document'),
      recipientId: z.string().describe('UUID of the recipient to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the recipient was successfully removed'),
      documentId: z.string().describe('Document UUID'),
      recipientId: z.string().describe('Removed recipient UUID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteRecipient(ctx.input.documentId, ctx.input.recipientId);

    return {
      output: {
        removed: true,
        documentId: ctx.input.documentId,
        recipientId: ctx.input.recipientId
      },
      message: `Removed recipient \`${ctx.input.recipientId}\` from document \`${ctx.input.documentId}\`.`
    };
  })
  .build();

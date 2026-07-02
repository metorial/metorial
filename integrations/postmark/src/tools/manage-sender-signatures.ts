import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type SenderSignatureRecord } from '../lib/client';
import { requirePostmarkNumber, requirePostmarkString } from '../lib/errors';
import { spec } from '../spec';

let senderSignatureOutput = z.object({
  senderId: z.number().describe('Postmark sender signature ID.'),
  emailAddress: z.string().describe('Sender email address.'),
  domain: z.string().describe('Sender domain.'),
  name: z.string().describe('Sender display name.'),
  replyToEmailAddress: z.string().describe('Reply-To email address.'),
  confirmed: z.boolean().describe('Whether the sender signature is confirmed.'),
  dkimVerified: z.boolean().optional().describe('Whether DKIM has been verified.'),
  returnPathDomain: z.string().optional().describe('Custom Return-Path domain.'),
  returnPathDomainVerified: z
    .boolean()
    .optional()
    .describe('Whether the Return-Path domain is verified.')
});

let mapSenderSignature = (sender: SenderSignatureRecord) => ({
  senderId: sender.ID,
  emailAddress: sender.EmailAddress,
  domain: sender.Domain,
  name: sender.Name,
  replyToEmailAddress: sender.ReplyToEmailAddress || '',
  confirmed: sender.Confirmed,
  dkimVerified: sender.DKIMVerified,
  returnPathDomain: sender.ReturnPathDomain || undefined,
  returnPathDomainVerified: sender.ReturnPathDomainVerified
});

export let manageSenderSignatures = SlateTool.create(spec, {
  name: 'Manage Sender Signatures',
  key: 'manage_sender_signatures',
  description: `List, get, create, update, delete, or resend confirmation for Postmark sender signatures. Sender signatures authorize individual From addresses for sending. Requires an Account API Token.`,
  instructions: [
    'Set **action** to "list", "get", "create", "update", "delete", or "resendConfirmation".',
    'For "create", provide **fromEmail** and **name**.',
    'For "get", "update", "delete", and "resendConfirmation", provide **senderId**.'
  ],
  constraints: [
    'Requires an Account API Token in addition to the Server API Token.',
    'DKIM/SPF sender-signature endpoints are intentionally omitted because Postmark directs DKIM work to the Domains API and marks legacy SPF verification deprecated.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'resendConfirmation'])
        .describe('Sender signature operation to perform.'),
      senderId: z.number().optional().describe('Postmark sender signature ID.'),
      fromEmail: z.string().optional().describe('Email address for a new sender signature.'),
      name: z.string().optional().describe('Sender display name for create or update.'),
      replyToEmail: z
        .string()
        .optional()
        .describe('Reply-To email address for create or update.'),
      confirmationPersonalNote: z
        .string()
        .optional()
        .describe('Personal note included in the confirmation email.'),
      count: z
        .number()
        .min(1)
        .max(500)
        .default(100)
        .describe('Number of sender signatures to return for list.'),
      offset: z.number().min(0).default(0).describe('Offset for list pagination.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total sender signatures.'),
      senderSignatures: z
        .array(senderSignatureOutput)
        .optional()
        .describe('Sender signatures returned by list.'),
      senderSignature: senderSignatureOutput
        .optional()
        .describe('Sender signature returned by the operation.'),
      deleted: z.boolean().optional().describe('Whether the sender signature was deleted.'),
      statusMessage: z.string().optional().describe('Postmark operation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.action === 'list') {
      let result = await client.listSenderSignatures({
        count: ctx.input.count,
        offset: ctx.input.offset
      });

      return {
        output: {
          totalCount: result.TotalCount,
          senderSignatures: result.SenderSignatures.map(mapSenderSignature)
        },
        message: `Found **${result.TotalCount}** Postmark sender signature(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let fromEmail = requirePostmarkString(ctx.input.fromEmail, 'fromEmail', 'create');
      let name = requirePostmarkString(ctx.input.name, 'name', 'create');
      let sender = await client.createSenderSignature({
        fromEmail,
        name,
        replyToEmail: ctx.input.replyToEmail,
        confirmationPersonalNote: ctx.input.confirmationPersonalNote
      });

      return {
        output: {
          senderSignature: mapSenderSignature(sender)
        },
        message: `Created Postmark sender signature **${sender.EmailAddress}** (ID: ${sender.ID}).`
      };
    }

    let senderId = requirePostmarkNumber(ctx.input.senderId, 'senderId', ctx.input.action);

    if (ctx.input.action === 'get') {
      let sender = await client.getSenderSignature(senderId);
      return {
        output: {
          senderSignature: mapSenderSignature(sender)
        },
        message: `Retrieved Postmark sender signature **${sender.EmailAddress}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let sender = await client.editSenderSignature(senderId, {
        name: ctx.input.name,
        replyToEmail: ctx.input.replyToEmail,
        confirmationPersonalNote: ctx.input.confirmationPersonalNote
      });

      return {
        output: {
          senderSignature: mapSenderSignature(sender)
        },
        message: `Updated Postmark sender signature **${sender.EmailAddress}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let result = await client.deleteSenderSignature(senderId);
      return {
        output: {
          deleted: true,
          statusMessage: result.Message
        },
        message: `Deleted Postmark sender signature **${senderId}**.`
      };
    }

    let result = await client.resendSenderSignatureConfirmation(senderId);
    return {
      output: {
        statusMessage: result.Message
      },
      message: `Requested confirmation resend for Postmark sender signature **${senderId}**.`
    };
  });

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let verifiedSenderSchema = z.object({
  senderId: z.number().describe('Verified sender ID'),
  nickname: z.string().describe('Nickname for the sender'),
  fromEmail: z.string().describe('Sender email address'),
  fromName: z.string().optional().describe('Sender display name'),
  replyTo: z.string().describe('Reply-to email address'),
  replyToName: z.string().optional().describe('Reply-to display name'),
  address: z.string().optional().describe('Physical address line 1'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State/province'),
  zip: z.string().optional().describe('Postal/ZIP code'),
  country: z.string().optional().describe('Country'),
  verified: z.boolean().describe('Whether the sender has been verified'),
  locked: z.boolean().optional().describe('Whether the sender is locked')
});

export let listVerifiedSenders = SlateTool.create(spec, {
  name: 'List Verified Senders',
  key: 'list_verified_senders',
  description: `Retrieve all verified sender identities. Verified senders are required to send emails. Use this to see which sender addresses are available.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      senders: z.array(verifiedSenderSchema).describe('Verified sender identities')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listVerifiedSenders();

    let senders = (result.results || []).map((s: any) => ({
      senderId: s.id,
      nickname: s.nickname,
      fromEmail: s.from_email,
      fromName: s.from_name,
      replyTo: s.reply_to,
      replyToName: s.reply_to_name,
      address: s.address,
      city: s.city,
      state: s.state,
      zip: s.zip,
      country: s.country,
      verified: s.verified,
      locked: s.locked
    }));

    return {
      output: { senders },
      message: `Found **${senders.length}** verified sender(s).`
    };
  });

export let createVerifiedSender = SlateTool.create(spec, {
  name: 'Create Verified Sender',
  key: 'create_verified_sender',
  description: `Create a new verified sender identity. A verification email will be sent to the provided address. The sender must be verified before it can be used to send emails.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      nickname: z.string().describe('Friendly name to identify this sender'),
      fromEmail: z.string().describe('Email address to send from'),
      fromName: z.string().optional().describe('Display name shown to recipients'),
      replyTo: z.string().describe('Reply-to email address'),
      replyToName: z.string().optional().describe('Reply-to display name'),
      address: z
        .string()
        .optional()
        .describe('Physical address (required for CAN-SPAM compliance)'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      country: z.string().optional().describe('Country')
    })
  )
  .output(verifiedSenderSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let s = await client.createVerifiedSender(ctx.input);

    return {
      output: {
        senderId: s.id,
        nickname: s.nickname,
        fromEmail: s.from_email,
        fromName: s.from_name,
        replyTo: s.reply_to,
        replyToName: s.reply_to_name,
        address: s.address,
        city: s.city,
        state: s.state,
        zip: s.zip,
        country: s.country,
        verified: s.verified || false,
        locked: s.locked
      },
      message: `Created verified sender **${s.nickname}** (\`${s.from_email}\`). A verification email has been sent.`
    };
  });

export let deleteVerifiedSender = SlateTool.create(spec, {
  name: 'Delete Verified Sender',
  key: 'delete_verified_sender',
  description: `Delete a verified sender identity by its ID. This sender will no longer be available for sending emails.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      senderId: z.number().describe('ID of the verified sender to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteVerifiedSender(ctx.input.senderId);

    return {
      output: { deleted: true },
      message: `Deleted verified sender with ID ${ctx.input.senderId}.`
    };
  });

export let resendSenderVerification = SlateTool.create(spec, {
  name: 'Resend Sender Verification',
  key: 'resend_sender_verification',
  description: `Resend the verification email for a verified sender identity that has not yet been verified.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      senderId: z.number().describe('ID of the verified sender to resend verification for')
    })
  )
  .output(
    z.object({
      sent: z.boolean().describe('Whether the verification email was resent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    await client.resendVerifiedSenderVerification(ctx.input.senderId);

    return {
      output: { sent: true },
      message: `Resent verification email for sender ID ${ctx.input.senderId}.`
    };
  });

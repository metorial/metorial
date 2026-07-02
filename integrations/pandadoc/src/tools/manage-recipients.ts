import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { pandadocServiceError } from '../lib/errors';
import { spec } from '../spec';

let deliveryMethodsSchema = z
  .record(z.string(), z.boolean())
  .describe('PandaDoc delivery methods, such as email or sms');

let redirectSchema = z
  .record(z.string(), z.any())
  .describe('PandaDoc recipient redirect settings');

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
      email: z.string().optional().describe('Recipient email address'),
      phone: z.string().optional().describe('Recipient phone number'),
      firstName: z.string().optional().describe('Recipient first name'),
      lastName: z.string().optional().describe('Recipient last name'),
      company: z.string().optional().describe('Recipient company name'),
      deliveryMethods: deliveryMethodsSchema.optional(),
      redirect: redirectSchema.optional()
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('UUID of the added recipient'),
      email: z.string().optional().describe('Recipient email'),
      phone: z.string().optional().describe('Recipient phone number'),
      firstName: z.string().optional().describe('Recipient first name'),
      lastName: z.string().optional().describe('Recipient last name'),
      company: z.string().optional().describe('Recipient company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    if (!ctx.input.email && !ctx.input.phone) {
      throw pandadocServiceError('Provide at least one of email or phone.');
    }

    let result = await client.addRecipient(ctx.input.documentId, {
      email: ctx.input.email,
      phone: ctx.input.phone,
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      company: ctx.input.company,
      delivery_methods: ctx.input.deliveryMethods,
      redirect: ctx.input.redirect
    });

    return {
      output: {
        recipientId: result.id,
        email: result.email || ctx.input.email,
        phone: result.phone || ctx.input.phone,
        firstName: result.first_name || ctx.input.firstName,
        lastName: result.last_name || ctx.input.lastName,
        company: result.company || ctx.input.company
      },
      message: `Added recipient **${ctx.input.email || ctx.input.phone}** to document \`${ctx.input.documentId}\`.`
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
      phone: z.string().optional().describe('New phone number'),
      firstName: z.string().optional().describe('New first name'),
      lastName: z.string().optional().describe('New last name'),
      company: z.string().optional().describe('New company name'),
      jobTitle: z.string().optional().describe('New job title'),
      state: z.string().optional().describe('New state'),
      streetAddress: z.string().optional().describe('New street address'),
      city: z.string().optional().describe('New city'),
      postalCode: z.string().optional().describe('New postal code'),
      deliveryMethods: deliveryMethodsSchema.optional(),
      redirect: redirectSchema.optional(),
      verificationSettings: z
        .record(z.string(), z.any())
        .optional()
        .describe('PandaDoc verification_settings payload')
    })
  )
  .output(
    z.object({
      recipientId: z.string().describe('UUID of the updated recipient'),
      email: z.string().optional().describe('Recipient email'),
      phone: z.string().optional().describe('Recipient phone number'),
      firstName: z.string().optional().describe('Recipient first name'),
      lastName: z.string().optional().describe('Recipient last name'),
      company: z.string().optional().describe('Recipient company name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let updateParams: any = {};
    if (ctx.input.email) updateParams.email = ctx.input.email;
    if (ctx.input.phone) updateParams.phone = ctx.input.phone;
    if (ctx.input.firstName) updateParams.first_name = ctx.input.firstName;
    if (ctx.input.lastName) updateParams.last_name = ctx.input.lastName;
    if (ctx.input.company) updateParams.company = ctx.input.company;
    if (ctx.input.jobTitle) updateParams.job_title = ctx.input.jobTitle;
    if (ctx.input.state) updateParams.state = ctx.input.state;
    if (ctx.input.streetAddress) updateParams.street_address = ctx.input.streetAddress;
    if (ctx.input.city) updateParams.city = ctx.input.city;
    if (ctx.input.postalCode) updateParams.postal_code = ctx.input.postalCode;
    if (ctx.input.deliveryMethods) updateParams.delivery_methods = ctx.input.deliveryMethods;
    if (ctx.input.redirect) updateParams.redirect = ctx.input.redirect;
    if (ctx.input.verificationSettings) {
      updateParams.verification_settings = ctx.input.verificationSettings;
    }

    if (Object.keys(updateParams).length === 0) {
      throw pandadocServiceError('Provide at least one recipient field to update.');
    }

    let result = await client.updateRecipient(
      ctx.input.documentId,
      ctx.input.recipientId,
      updateParams
    );

    return {
      output: {
        recipientId: result?.id || ctx.input.recipientId,
        email: result?.email || ctx.input.email,
        phone: result?.phone || ctx.input.phone,
        firstName: result?.first_name || ctx.input.firstName,
        lastName: result?.last_name || ctx.input.lastName,
        company: result?.company || ctx.input.company
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

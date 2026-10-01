import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let identitySchema = z.object({
  type: z
    .enum(['email', 'mobile', 'twitter', 'facebook', 'instagram', 'igsid'])
    .describe('Identity type; igsid is an Instagram-scoped ID'),
  identifier: z.string().describe('Email address, phone number, handle, or scoped ID')
});

let identitiesSchema = z.object({
  identities: z.array(identitySchema).describe('Identities associated with the contact')
});

let readIdentities = (result: unknown) => {
  let parsed = identitiesSchema.safeParse(result);
  if (!parsed.success) {
    throw createApiServiceError(
      'Re:amaze returned an unexpected contact identities response. Call list_contact_identities to verify the contact identities before retrying a write.'
    );
  }
  return parsed.data;
};

let validateContactEmail = (contactEmail: string) => {
  if (!z.email().safeParse(contactEmail).success) {
    throw createApiServiceError('Provide the email address of an existing contact.');
  }
};

export let listContactIdentities = SlateTool.create(spec, {
  name: 'List Contact Identities',
  key: 'list_contact_identities',
  description: `List the email, mobile, and social identities associated with a contact identified by email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactEmail: z.string().describe('Email address of an existing contact')
    })
  )
  .output(identitiesSchema)
  .handleInvocation(async ctx => {
    validateContactEmail(ctx.input.contactEmail);
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let output = readIdentities(await client.listContactIdentities(ctx.input.contactEmail));
    return {
      output,
      message: `Found **${output.identities.length}** identities for contact **${ctx.input.contactEmail}**.`
    };
  })
  .build();

export let createContactIdentity = SlateTool.create(spec, {
  name: 'Create Contact Identity',
  key: 'create_contact_identity',
  description: `Associate an email, mobile, Twitter, or Instagram identity with an existing contact. If the identity belongs to another contact, its messages and data move to this contact.`,
  constraints: [
    'An existing identity and all its messages and data will be transferred from its previous contact.',
    'Adding Facebook identities is not supported.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactEmail: z.string().describe('Email address of the contact receiving the identity'),
      type: z
        .enum(['email', 'mobile', 'twitter', 'instagram', 'igsid'])
        .describe('Identity type; igsid is an Instagram-scoped ID'),
      identifier: z
        .string()
        .describe('Identity value; email address, E.164 mobile number, handle, or scoped ID')
    })
  )
  .output(identitiesSchema)
  .handleInvocation(async ctx => {
    validateContactEmail(ctx.input.contactEmail);
    if (!ctx.input.identifier.trim()) {
      throw createApiServiceError(
        'Provide the identity identifier to associate with the contact.'
      );
    }
    if (ctx.input.type === 'email' && !z.email().safeParse(ctx.input.identifier).success) {
      throw createApiServiceError('Provide a valid email address for an email identity.');
    }
    if (ctx.input.type === 'mobile' && !/^\+[1-9]\d{1,14}$/.test(ctx.input.identifier)) {
      throw createApiServiceError(
        'Provide the mobile identity in E.164 format, such as +12223334444.'
      );
    }
    let client = new Client({
      token: ctx.auth.token,
      loginEmail: ctx.auth.loginEmail,
      brandSubdomain: ctx.config.brandSubdomain
    });
    let output = readIdentities(
      await client.createContactIdentity(ctx.input.contactEmail, {
        type: ctx.input.type,
        identifier: ctx.input.identifier
      })
    );
    return {
      output,
      message: `Associated ${ctx.input.type} identity **${ctx.input.identifier}** with contact **${ctx.input.contactEmail}**.`
    };
  })
  .build();

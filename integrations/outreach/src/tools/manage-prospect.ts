import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  buildRelationship,
  cleanAttributes,
  flattenResource,
  mergeRelationships
} from '../lib/helpers';
import { spec } from '../spec';

export let manageProspect = SlateTool.create(spec, {
  name: 'Manage Prospect',
  key: 'manage_prospect',
  description: `Create, update, or delete a prospect (contact/lead) in Outreach.
Use this to add new prospects, modify existing prospect information, or remove prospects.
Prospects can be associated with accounts and include contact details, engagement data, and custom fields.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the prospect'),
      prospectId: z.string().optional().describe('Prospect ID (required for update/delete)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Primary email address'),
      title: z.string().optional().describe('Job title'),
      company: z.string().optional().describe('Company name (if not linking to an account)'),
      phone: z.string().optional().describe('Work phone number'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      homePhone: z.string().optional().describe('Home phone number'),
      addressStreet: z.string().optional().describe('Street address'),
      addressCity: z.string().optional().describe('City'),
      addressState: z.string().optional().describe('State'),
      addressZip: z.string().optional().describe('ZIP/postal code'),
      addressCountry: z.string().optional().describe('Country'),
      linkedInUrl: z.string().optional().describe('LinkedIn profile URL'),
      twitterUsername: z.string().optional().describe('Twitter/X username'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the prospect'),
      accountId: z.string().optional().describe('Account ID to associate with'),
      ownerId: z.string().optional().describe('User ID of the prospect owner'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as key-value pairs (e.g. custom1, custom2, ...)')
    })
  )
  .output(
    z.object({
      prospectId: z.string().optional().describe('ID of the prospect'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      title: z.string().optional(),
      company: z.string().optional(),
      deleted: z.boolean().optional().describe('True if the prospect was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'delete') {
      if (!ctx.input.prospectId) throw new Error('prospectId is required for delete');
      await client.deleteProspect(ctx.input.prospectId);
      return {
        output: { prospectId: ctx.input.prospectId, deleted: true },
        message: `Prospect **${ctx.input.prospectId}** deleted successfully.`
      };
    }

    let attributes = cleanAttributes({
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      emails: ctx.input.email ? [ctx.input.email] : undefined,
      title: ctx.input.title,
      company: ctx.input.company,
      workPhones: ctx.input.phone ? [ctx.input.phone] : undefined,
      mobilePhones: ctx.input.mobilePhone ? [ctx.input.mobilePhone] : undefined,
      homePhones: ctx.input.homePhone ? [ctx.input.homePhone] : undefined,
      addressStreet: ctx.input.addressStreet,
      addressCity: ctx.input.addressCity,
      addressState: ctx.input.addressState,
      addressZip: ctx.input.addressZip,
      addressCountry: ctx.input.addressCountry,
      linkedInUrl: ctx.input.linkedInUrl,
      twitterUsername: ctx.input.twitterUsername,
      tags: ctx.input.tags,
      ...ctx.input.customFields
    });

    let relationships = mergeRelationships(
      buildRelationship('account', ctx.input.accountId),
      buildRelationship('owner', ctx.input.ownerId)
    );

    if (ctx.input.action === 'create') {
      let resource = await client.createProspect(attributes, relationships);
      let flat = flattenResource(resource);
      return {
        output: {
          prospectId: flat.id,
          firstName: flat.firstName,
          lastName: flat.lastName,
          email: flat.emails?.[0],
          title: flat.title,
          company: flat.company
        },
        message: `Prospect **${flat.firstName} ${flat.lastName}** created with ID ${flat.id}.`
      };
    }

    // update
    if (!ctx.input.prospectId) throw new Error('prospectId is required for update');
    let resource = await client.updateProspect(
      ctx.input.prospectId,
      attributes,
      relationships
    );
    let flat = flattenResource(resource);
    return {
      output: {
        prospectId: flat.id,
        firstName: flat.firstName,
        lastName: flat.lastName,
        email: flat.emails?.[0],
        title: flat.title,
        company: flat.company
      },
      message: `Prospect **${flat.firstName} ${flat.lastName}** (${flat.id}) updated successfully.`
    };
  })
  .build();

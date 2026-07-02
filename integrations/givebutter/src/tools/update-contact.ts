import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's profile information. Only provided fields will be updated. Can also archive or restore contacts.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      firstName: z.string().optional().describe('New first name'),
      middleName: z.string().optional().describe('New middle name'),
      lastName: z.string().optional().describe('New last name'),
      dob: z.string().optional().describe('New date of birth (ISO 8601)'),
      company: z.string().optional().describe('New company name'),
      title: z.string().optional().describe('New title/position'),
      twitterUrl: z.string().optional().describe('New Twitter URL'),
      linkedinUrl: z.string().optional().describe('New LinkedIn URL'),
      facebookUrl: z.string().optional().describe('New Facebook URL'),
      archive: z
        .boolean()
        .optional()
        .describe('Set to true to archive the contact, false to restore')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the updated contact'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      primaryEmail: z.string().nullable().describe('Primary email'),
      archivedAt: z.string().nullable().describe('When archived'),
      updatedAt: z.string().nullable().describe('When last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.archive === true) {
      await client.archiveContact(ctx.input.contactId);
      return {
        output: {
          contactId: ctx.input.contactId,
          firstName: null,
          lastName: null,
          primaryEmail: null,
          archivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        message: `Archived contact **${ctx.input.contactId}**.`
      };
    }

    if (ctx.input.archive === false) {
      let c = await client.restoreContact(ctx.input.contactId);
      return {
        output: {
          contactId: c.id,
          firstName: c.first_name ?? null,
          lastName: c.last_name ?? null,
          primaryEmail: c.primary_email ?? null,
          archivedAt: c.archived_at ?? null,
          updatedAt: c.updated_at ?? null
        },
        message: `Restored contact **${[c.first_name, c.last_name].filter(Boolean).join(' ') || c.id}**.`
      };
    }

    let updateData: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) updateData.first_name = ctx.input.firstName;
    if (ctx.input.middleName !== undefined) updateData.middle_name = ctx.input.middleName;
    if (ctx.input.lastName !== undefined) updateData.last_name = ctx.input.lastName;
    if (ctx.input.dob !== undefined) updateData.dob = ctx.input.dob;
    if (ctx.input.company !== undefined) updateData.company = ctx.input.company;
    if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
    if (ctx.input.twitterUrl !== undefined) updateData.twitter_url = ctx.input.twitterUrl;
    if (ctx.input.linkedinUrl !== undefined) updateData.linkedin_url = ctx.input.linkedinUrl;
    if (ctx.input.facebookUrl !== undefined) updateData.facebook_url = ctx.input.facebookUrl;

    let c = await client.updateContact(ctx.input.contactId, updateData);

    return {
      output: {
        contactId: c.id,
        firstName: c.first_name ?? null,
        lastName: c.last_name ?? null,
        primaryEmail: c.primary_email ?? null,
        archivedAt: c.archived_at ?? null,
        updatedAt: c.updated_at ?? null
      },
      message: `Updated contact **${[c.first_name, c.last_name].filter(Boolean).join(' ') || c.id}**.`
    };
  })
  .build();

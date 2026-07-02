import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import {
  arrayOrUndefined,
  booleanOrUndefined,
  numberOrUndefined,
  objectOrUndefined,
  stringOrUndefined,
  timestampOrUndefined
} from '../lib/output';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve a single contact by their Intercom ID or external ID. Returns full contact details including custom attributes, tags, companies, and segments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().optional().describe('Intercom contact ID'),
      externalId: z
        .string()
        .optional()
        .describe('External ID from your system (used if contactId is not provided)')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Intercom contact ID'),
      role: z.string().optional().describe('Contact role (user or lead)'),
      email: z.string().optional().describe('Contact email'),
      name: z.string().optional().describe('Contact name'),
      phone: z.string().optional().describe('Contact phone'),
      externalId: z.string().optional().describe('External ID'),
      workspaceId: z.string().optional().describe('Workspace ID'),
      emailDomain: z.string().optional().describe('Email domain'),
      ownerId: z.number().optional().describe('Owner admin ID'),
      hasHardBounced: z.boolean().optional().describe('Whether email has hard bounced'),
      markedEmailAsSpam: z
        .boolean()
        .optional()
        .describe('Whether contact marked email as spam'),
      unsubscribedFromEmails: z
        .boolean()
        .optional()
        .describe('Whether contact unsubscribed from emails'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      signedUpAt: z.string().optional().describe('Sign up timestamp'),
      lastSeenAt: z.string().optional().describe('Last seen timestamp'),
      lastContactedAt: z.string().optional().describe('Last contacted timestamp'),
      lastRepliedAt: z.string().optional().describe('Last replied timestamp'),
      lastEmailOpenedAt: z.string().optional().describe('Last email opened timestamp'),
      lastEmailClickedAt: z.string().optional().describe('Last email clicked timestamp'),
      browserLanguage: z.string().optional().describe('Browser language'),
      languageOverride: z.string().optional().describe('Language override'),
      browser: z.string().optional().describe('Browser name'),
      browserVersion: z.string().optional().describe('Browser version'),
      os: z.string().optional().describe('Operating system'),
      location: z.any().optional().describe('Location data'),
      customAttributes: z.record(z.string(), z.any()).optional().describe('Custom attributes'),
      tags: z.array(z.any()).optional().describe('Associated tags'),
      companies: z.array(z.any()).optional().describe('Associated companies'),
      socialProfiles: z.array(z.any()).optional().describe('Social profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result: any;
    if (ctx.input.contactId) {
      result = await client.getContact(ctx.input.contactId);
    } else if (ctx.input.externalId) {
      result = await client.getContactByExternalId(ctx.input.externalId);
    } else {
      throw intercomServiceError('Either contactId or externalId must be provided');
    }

    return {
      output: {
        contactId: String(result.id),
        role: stringOrUndefined(result.role),
        email: stringOrUndefined(result.email),
        name: stringOrUndefined(result.name),
        phone: stringOrUndefined(result.phone),
        externalId: stringOrUndefined(result.external_id),
        workspaceId: stringOrUndefined(result.workspace_id),
        emailDomain: stringOrUndefined(result.email_domain),
        ownerId: numberOrUndefined(result.owner_id),
        hasHardBounced: booleanOrUndefined(result.has_hard_bounced),
        markedEmailAsSpam: booleanOrUndefined(result.marked_email_as_spam),
        unsubscribedFromEmails: booleanOrUndefined(result.unsubscribed_from_emails),
        createdAt: timestampOrUndefined(result.created_at),
        updatedAt: timestampOrUndefined(result.updated_at),
        signedUpAt: timestampOrUndefined(result.signed_up_at),
        lastSeenAt: timestampOrUndefined(result.last_seen_at),
        lastContactedAt: timestampOrUndefined(result.last_contacted_at),
        lastRepliedAt: timestampOrUndefined(result.last_replied_at),
        lastEmailOpenedAt: timestampOrUndefined(result.last_email_opened_at),
        lastEmailClickedAt: timestampOrUndefined(result.last_email_clicked_at),
        browserLanguage: stringOrUndefined(result.browser_language),
        languageOverride: stringOrUndefined(result.language_override),
        browser: stringOrUndefined(result.browser),
        browserVersion: stringOrUndefined(result.browser_version),
        os: stringOrUndefined(result.os),
        location: objectOrUndefined(result.location),
        customAttributes: objectOrUndefined(result.custom_attributes),
        tags: arrayOrUndefined(result.tags?.data),
        companies: arrayOrUndefined(result.companies?.data),
        socialProfiles: arrayOrUndefined(result.social_profiles?.data)
      },
      message: `Retrieved contact **${result.name || result.email || result.id}** (${result.role})`
    };
  })
  .build();

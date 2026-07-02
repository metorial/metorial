import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactIdentifiers = SlateTool.create(spec, {
  name: 'Manage Contact Identifiers',
  key: 'manage_contact_identifiers',
  description: `Create, find, link, or unlink contact identifiers. Contact identifiers are used to associate physical cards, QR codes, or other identifiers with contacts in the loyalty system.`
})
  .input(
    z.object({
      action: z
        .enum(['find', 'create', 'link', 'unlink', 'list'])
        .describe('Action to perform on contact identifiers'),
      contactIdentifierValue: z
        .string()
        .optional()
        .describe('The identifier value (required for find, create, link, unlink)'),
      contactUuid: z
        .string()
        .optional()
        .describe('Contact UUID (required for link, optional for create, required for list)'),
      contactIdentifierName: z
        .string()
        .optional()
        .describe('Display name for the identifier (used in create)')
    })
  )
  .output(
    z.object({
      identifiers: z
        .array(
          z
            .object({
              identifierValue: z.string().optional().describe('The identifier value'),
              contactUuid: z.string().optional().describe('Linked contact UUID'),
              name: z.string().optional().describe('Identifier display name'),
              active: z.boolean().optional().describe('Whether the identifier is active')
            })
            .passthrough()
        )
        .optional()
        .describe('List of identifiers (for list action)'),
      identifier: z
        .object({
          identifierValue: z.string().optional().describe('The identifier value'),
          contactUuid: z.string().optional().describe('Linked contact UUID'),
          name: z.string().optional().describe('Identifier display name'),
          active: z.boolean().optional().describe('Whether the identifier is active')
        })
        .passthrough()
        .optional()
        .describe('Single identifier result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, contactIdentifierValue, contactUuid, contactIdentifierName } = ctx.input;

    if (action === 'list') {
      if (!contactUuid) throw new Error('contactUuid is required for listing identifiers');
      let result = await client.getContactIdentifiers(contactUuid);
      let identifiers = (result.data || []).map((id: any) => ({
        identifierValue: id.value || id.contact_identifier_value,
        contactUuid: id.contact?.uuid,
        name: id.name || id.contact_identifier_name,
        active: id.active ?? id.contact_identifier_active,
        ...id
      }));
      return {
        output: { identifiers },
        message: `Found **${identifiers.length}** identifier(s) for contact ${contactUuid}.`
      };
    }

    if (!contactIdentifierValue)
      throw new Error('contactIdentifierValue is required for this action');

    if (action === 'find') {
      let result = await client.findContactIdentifier(contactIdentifierValue);
      let id = result.data || result;
      return {
        output: {
          identifier: {
            identifierValue: id.value || id.contact_identifier_value || contactIdentifierValue,
            contactUuid: id.contact?.uuid,
            name: id.name || id.contact_identifier_name,
            active: id.active ?? id.contact_identifier_active,
            ...id
          }
        },
        message: `Found identifier **${contactIdentifierValue}**.`
      };
    }

    if (action === 'create') {
      let result = await client.createContactIdentifier({
        contactIdentifierValue,
        contactUuid,
        contactIdentifierName
      });
      let id = result.data || result;
      return {
        output: {
          identifier: {
            identifierValue: id.value || id.contact_identifier_value || contactIdentifierValue,
            contactUuid: id.contact?.uuid || contactUuid,
            name: id.name || id.contact_identifier_name,
            active: id.active ?? id.contact_identifier_active,
            ...id
          }
        },
        message: `Created identifier **${contactIdentifierValue}**${contactUuid ? ` linked to ${contactUuid}` : ''}.`
      };
    }

    if (action === 'link') {
      if (!contactUuid) throw new Error('contactUuid is required for link action');
      let result = await client.linkContactIdentifier(contactIdentifierValue, contactUuid);
      let id = result.data || result;
      return {
        output: {
          identifier: {
            identifierValue: contactIdentifierValue,
            contactUuid,
            ...id
          }
        },
        message: `Linked identifier **${contactIdentifierValue}** to contact ${contactUuid}.`
      };
    }

    // unlink
    let result = await client.unlinkContactIdentifier(contactIdentifierValue);
    let id = result.data || result;
    return {
      output: {
        identifier: {
          identifierValue: contactIdentifierValue,
          ...id
        }
      },
      message: `Unlinked identifier **${contactIdentifierValue}** from its contact.`
    };
  })
  .build();

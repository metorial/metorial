import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppDragClient } from '../lib/client';
import { spec } from '../spec';

export let manageNewsletterContacts = SlateTool.create(spec, {
  name: 'Manage Newsletter Contacts',
  key: 'manage_newsletter_contacts',
  description: `Add or remove contacts from AppDrag newsletter lists. Supports adding contacts with names to lists and removing contacts from lists.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add contacts to or remove contacts from newsletter lists.'),
      listNames: z
        .string()
        .describe('Comma-separated list of newsletter list names to add to or remove from.'),
      emails: z.string().describe('Comma-separated list of contact email addresses.'),
      firstNames: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of contact first names (used when adding contacts). Must match the order of emails.'
        ),
      lastNames: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of contact last names (used when adding contacts). Must match the order of emails.'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result from the newsletter API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppDragClient({
      apiKey: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result: any;

    if (ctx.input.action === 'add') {
      result = await client.newsletterInsertContacts({
        listsToAdd: ctx.input.listNames,
        contactsMail: ctx.input.emails,
        contactsFirstName: ctx.input.firstNames || '',
        contactsLastName: ctx.input.lastNames || ''
      });
    } else {
      result = await client.newsletterDeleteContacts({
        listsToDelete: ctx.input.listNames,
        contactsMail: ctx.input.emails
      });
    }

    return {
      output: {
        result
      },
      message: `Newsletter contacts **${ctx.input.action === 'add' ? 'added to' : 'removed from'}** list(s): ${ctx.input.listNames}.`
    };
  })
  .build();

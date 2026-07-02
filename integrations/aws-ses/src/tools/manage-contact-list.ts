import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { requireAwsSesString } from '../lib/errors';
import { spec } from '../spec';

let topicSchema = z.object({
  topicName: z.string().describe('Unique topic identifier'),
  displayName: z.string().describe('Display name shown to contacts'),
  description: z.string().optional().describe('Topic description'),
  defaultSubscriptionStatus: z
    .enum(['OPT_IN', 'OPT_OUT'])
    .describe('Default subscription status for new contacts')
});

export let manageContactList = SlateTool.create(spec, {
  name: 'Manage Contact List',
  key: 'manage_contact_list',
  description: `Create, update, retrieve, delete, or list SES contact lists. Contact lists enable subscription management and compliance with unsubscribe requirements. Each list can have multiple topics that contacts can individually subscribe to or opt out of.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Operation to perform'),
      contactListName: z
        .string()
        .optional()
        .describe('Contact list name (required for all except "list")'),
      description: z.string().optional().describe('Description of the contact list'),
      topics: z.array(topicSchema).optional().describe('Topics within the contact list'),
      nextToken: z.string().optional().describe('Pagination token for "list" action'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contactListName: z.string().optional().describe('Contact list name'),
      description: z.string().optional().describe('Contact list description'),
      topics: z
        .array(
          z.object({
            topicName: z.string(),
            displayName: z.string(),
            description: z.string().optional(),
            defaultSubscriptionStatus: z.string()
          })
        )
        .optional()
        .describe('Topics in the contact list'),
      createdTimestamp: z.string().optional().describe('When the list was created'),
      lastUpdatedTimestamp: z.string().optional().describe('When the list was last updated'),
      contactLists: z
        .array(
          z.object({
            contactListName: z.string(),
            lastUpdatedTimestamp: z.string().optional()
          })
        )
        .optional()
        .describe('List of contact lists'),
      nextToken: z.string().optional().describe('Pagination token')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let contactListName = requireAwsSesString(
        ctx.input.contactListName,
        'contactListName',
        action
      );
      await client.createContactList({
        contactListName,
        description: ctx.input.description,
        topics: ctx.input.topics
      });
      return {
        output: { contactListName },
        message: `Contact list **${contactListName}** created.`
      };
    }

    if (action === 'get') {
      let contactListName = requireAwsSesString(
        ctx.input.contactListName,
        'contactListName',
        action
      );
      let result = await client.getContactList(contactListName);
      return {
        output: result,
        message: `Retrieved contact list **${result.contactListName}**${result.topics ? ` with ${result.topics.length} topic(s)` : ''}.`
      };
    }

    if (action === 'update') {
      let contactListName = requireAwsSesString(
        ctx.input.contactListName,
        'contactListName',
        action
      );
      await client.updateContactList({
        contactListName,
        description: ctx.input.description,
        topics: ctx.input.topics
      });
      return {
        output: { contactListName },
        message: `Contact list **${contactListName}** updated.`
      };
    }

    if (action === 'delete') {
      let contactListName = requireAwsSesString(
        ctx.input.contactListName,
        'contactListName',
        action
      );
      await client.deleteContactList(contactListName);
      return {
        output: { contactListName },
        message: `Contact list **${contactListName}** deleted.`
      };
    }

    if (action === 'list') {
      let result = await client.listContactLists({
        nextToken: ctx.input.nextToken,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          contactLists: result.contactLists,
          nextToken: result.nextToken
        },
        message: `Found **${result.contactLists.length}** contact list(s).${result.nextToken ? ' More results available.' : ''}`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();

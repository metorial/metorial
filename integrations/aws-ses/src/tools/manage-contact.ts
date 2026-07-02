import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

let topicPreferenceSchema = z.object({
  topicName: z.string().describe('Topic name'),
  subscriptionStatus: z
    .enum(['OPT_IN', 'OPT_OUT'])
    .describe('Subscription status for this topic')
});

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, retrieve, delete, or list contacts within an SES contact list. Contacts represent email recipients with topic-based subscription preferences. Use this to manage individual subscriber preferences and compliance status.`,
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
      contactListName: z.string().describe('Name of the contact list'),
      emailAddress: z
        .string()
        .optional()
        .describe('Contact email address (required for all except "list")'),
      topicPreferences: z
        .array(topicPreferenceSchema)
        .optional()
        .describe('Topic subscription preferences'),
      unsubscribeAll: z
        .boolean()
        .optional()
        .describe('Whether the contact has unsubscribed from all topics'),
      attributesData: z
        .string()
        .optional()
        .describe('JSON string of custom attributes for the contact'),
      nextToken: z.string().optional().describe('Pagination token for "list" action'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contactListName: z.string().optional(),
      emailAddress: z.string().optional(),
      topicPreferences: z
        .array(
          z.object({
            topicName: z.string(),
            subscriptionStatus: z.string()
          })
        )
        .optional()
        .describe('Topic subscription preferences'),
      topicDefaultPreferences: z
        .array(
          z.object({
            topicName: z.string(),
            subscriptionStatus: z.string()
          })
        )
        .optional()
        .describe('Default topic preferences'),
      unsubscribeAll: z.boolean().optional(),
      attributesData: z.string().optional(),
      createdTimestamp: z.string().optional(),
      lastUpdatedTimestamp: z.string().optional(),
      contacts: z
        .array(
          z.object({
            emailAddress: z.string(),
            topicPreferences: z
              .array(
                z.object({
                  topicName: z.string(),
                  subscriptionStatus: z.string()
                })
              )
              .optional(),
            unsubscribeAll: z.boolean(),
            lastUpdatedTimestamp: z.string().optional()
          })
        )
        .optional()
        .describe('List of contacts'),
      nextToken: z.string().optional()
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
      await client.createContact({
        contactListName: ctx.input.contactListName,
        emailAddress: ctx.input.emailAddress!,
        topicPreferences: ctx.input.topicPreferences,
        unsubscribeAll: ctx.input.unsubscribeAll,
        attributesData: ctx.input.attributesData
      });
      return {
        output: {
          contactListName: ctx.input.contactListName,
          emailAddress: ctx.input.emailAddress
        },
        message: `Contact **${ctx.input.emailAddress}** added to list **${ctx.input.contactListName}**.`
      };
    }

    if (action === 'get') {
      let result = await client.getContact(ctx.input.contactListName, ctx.input.emailAddress!);
      return {
        output: result,
        message: `Retrieved contact **${result.emailAddress}** from list **${result.contactListName}**.`
      };
    }

    if (action === 'update') {
      await client.updateContact({
        contactListName: ctx.input.contactListName,
        emailAddress: ctx.input.emailAddress!,
        topicPreferences: ctx.input.topicPreferences,
        unsubscribeAll: ctx.input.unsubscribeAll,
        attributesData: ctx.input.attributesData
      });
      return {
        output: {
          contactListName: ctx.input.contactListName,
          emailAddress: ctx.input.emailAddress
        },
        message: `Contact **${ctx.input.emailAddress}** updated in list **${ctx.input.contactListName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteContact(ctx.input.contactListName, ctx.input.emailAddress!);
      return {
        output: {
          contactListName: ctx.input.contactListName,
          emailAddress: ctx.input.emailAddress
        },
        message: `Contact **${ctx.input.emailAddress}** removed from list **${ctx.input.contactListName}**.`
      };
    }

    if (action === 'list') {
      let result = await client.listContacts({
        contactListName: ctx.input.contactListName,
        nextToken: ctx.input.nextToken,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          contacts: result.contacts,
          nextToken: result.nextToken
        },
        message: `Found **${result.contacts.length}** contact(s) in list **${ctx.input.contactListName}**.${result.nextToken ? ' More results available.' : ''}`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();

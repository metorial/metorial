import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import {
  ActiveTrailClient,
  readId,
  readMailingList,
  readRecord,
  redactProviderData
} from '../lib/client';
import { spec } from '../spec';

export let getMailingList = SlateTool.create(spec, {
  name: 'Get Mailing List',
  key: 'get_mailing_list',
  description: 'Retrieve a mailing list by ID. Call list_mailing_lists to discover IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ mailingListId: z.number().describe('Mailing list ID from list_mailing_lists') })
  )
  .output(z.object({ mailingListId: z.number(), name: z.string(), raw: z.any() }))
  .handleInvocation(async ctx => {
    let result = await new ActiveTrailClient(ctx.auth.token).getMailingList(
      ctx.input.mailingListId
    );
    return redactProviderData(
      {
        output: {
          ...readMailingList(result),
          raw: result
        },
        message: 'Retrieved mailing list.'
      },
      ctx.auth.token
    );
  })
  .build();

export let removeContactFromMailingList = SlateTool.create(spec, {
  name: 'Remove Contact from Mailing List',
  key: 'remove_contact_from_mailing_list',
  description: 'Remove a contact from a mailing list. The contact remains in the account.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      mailingListId: z.number().describe('Mailing list ID from list_mailing_lists'),
      contactId: z.number().describe('Contact ID from list_contacts')
    })
  )
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    await new ActiveTrailClient(ctx.auth.token).removeContactFromMailingList(
      ctx.input.mailingListId,
      ctx.input.contactId
    );
    return redactProviderData(
      { output: { success: true }, message: 'Removed contact from mailing list.' },
      ctx.auth.token
    );
  })
  .build();

export let listTemplateCategories = SlateTool.create(spec, {
  name: 'List Template Categories',
  key: 'list_template_categories',
  description: 'Discover reusable email template categories and their IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ categories: z.array(z.any()) }))
  .handleInvocation(async ctx => {
    let categories = await new ActiveTrailClient(ctx.auth.token).listTemplateCategories();
    return redactProviderData(
      {
        output: { categories },
        message: `Found ${categories.length} template categories.`
      },
      ctx.auth.token
    );
  })
  .build();

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description:
    'Update an email template name, subject, content, or category. Call list_templates to discover IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      templateId: z.number(),
      name: z.string().optional(),
      subject: z.string().optional(),
      content: z.string().optional(),
      categoryId: z.number().optional().describe('Category ID from list_template_categories')
    })
  )
  .output(z.object({ success: z.boolean(), templateId: z.number() }))
  .handleInvocation(async ctx => {
    if (
      Object.entries(ctx.input).every(
        ([key, value]) => key === 'templateId' || value === undefined
      )
    )
      throw createApiServiceError('Provide at least one template field to update.');
    let client = new ActiveTrailClient(ctx.auth.token);
    let current = await client.getTemplate(ctx.input.templateId);
    let changes = {
      name: ctx.input.name,
      subject: ctx.input.subject,
      content: ctx.input.content,
      template_category_id: ctx.input.categoryId
    };
    await client.updateTemplate(ctx.input.templateId, {
      ...current,
      ...pickDefined(changes)
    });
    return redactProviderData(
      {
        output: { success: true, templateId: ctx.input.templateId },
        message: 'Updated email template.'
      },
      ctx.auth.token
    );
  })
  .build();

export let listWhatsAppProfiles = SlateTool.create(spec, {
  name: 'List WhatsApp Profiles',
  key: 'list_whatsapp_profiles',
  description:
    'Retrieve the account WhatsApp sending profiles for campaign and operational message setup.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ profiles: z.array(z.any()) }))
  .handleInvocation(async ctx => {
    let profiles = await new ActiveTrailClient(ctx.auth.token).listWhatsAppProfiles();
    return redactProviderData(
      { output: { profiles }, message: `Found ${profiles.length} WhatsApp profiles.` },
      ctx.auth.token
    );
  })
  .build();

export let getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description:
    'Retrieve a configured webhook and its parameters by ID. Call list_webhooks to discover IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ webhookId: z.number() }))
  .output(z.object({ webhookId: z.number(), webhook: z.any() }))
  .handleInvocation(async ctx => {
    let webhook = await new ActiveTrailClient(ctx.auth.token).getWebhook(ctx.input.webhookId);
    return redactProviderData(
      { output: { webhookId: readId(webhook), webhook }, message: 'Retrieved webhook.' },
      ctx.auth.token
    );
  })
  .build();

export let estimateSmsCampaign = SlateTool.create(spec, {
  name: 'Estimate SMS Campaign',
  key: 'estimate_sms_campaign',
  description: 'Estimate message usage for an SMS campaign that has not been sent.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      campaignId: z
        .number()
        .describe('Unsent SMS campaign ID. Call list_sms_campaigns with includeNotSent true.')
    })
  )
  .output(z.object({ estimate: z.any() }))
  .handleInvocation(async ctx => {
    let estimate = await new ActiveTrailClient(ctx.auth.token).estimateSmsCampaign(
      ctx.input.campaignId
    );
    return redactProviderData(
      { output: { estimate }, message: 'Retrieved SMS campaign estimate.' },
      ctx.auth.token
    );
  })
  .build();

export let listContactSubscriptions = SlateTool.create(spec, {
  name: 'List Contact Subscriptions',
  key: 'list_contact_subscriptions',
  description:
    'Retrieve subscribers or unsubscribers with the source of their status and date filtering.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      status: z.enum(['subscribers', 'unsubscribers']),
      fromDate: z.string().optional(),
      toDate: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional()
    })
  )
  .output(z.object({ contacts: z.array(z.any()) }))
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let contacts =
      ctx.input.status === 'subscribers'
        ? await client.getSubscribers(ctx.input)
        : await client.getUnsubscribers(ctx.input);
    return redactProviderData(
      { output: { contacts }, message: `Found ${contacts.length} ${ctx.input.status}.` },
      ctx.auth.token
    );
  })
  .build();

export let updateSmsCampaign = SlateTool.create(spec, {
  name: 'Update SMS Campaign',
  key: 'update_sms_campaign',
  description:
    'Update an SMS campaign, including content, recipients, or scheduling. Call list_sms_campaigns to discover IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      campaignId: z.number(),
      name: z.string().optional(),
      content: z.string().optional(),
      fromName: z.string().optional(),
      smsSendingProfileId: z
        .number()
        .optional()
        .describe('Sending profile ID from get_account_info'),
      groupIds: z.array(z.number()).optional(),
      mailingListId: z.number().optional(),
      isLinkTracking: z.boolean().optional(),
      isSent: z
        .boolean()
        .optional()
        .describe('Set true to send or schedule the updated campaign'),
      scheduledDate: z.string().optional(),
      scheduledTimeZone: z.string().optional()
    })
  )
  .output(z.object({ success: z.boolean(), campaignId: z.number() }))
  .handleInvocation(async ctx => {
    if (
      Object.entries(ctx.input).every(
        ([key, value]) => key === 'campaignId' || value === undefined
      )
    )
      throw createApiServiceError('Provide at least one SMS campaign field to update.');
    let client = new ActiveTrailClient(ctx.auth.token);
    let current = await client.getSmsCampaign(ctx.input.campaignId);
    let data = {
      ...current,
      id: readId(current),
      segment: readRecord(current.segment),
      scheduling: { ...readRecord(current.scheduling), is_sent: ctx.input.isSent ?? false },
      ...pickDefined({
        name: ctx.input.name,
        content: ctx.input.content,
        from_name: ctx.input.fromName,
        is_link_tracking: ctx.input.isLinkTracking
      })
    };
    if (
      ctx.input.groupIds !== undefined ||
      ctx.input.mailingListId !== undefined ||
      ctx.input.smsSendingProfileId !== undefined
    ) {
      data.segment = {
        ...readRecord(current.segment),
        ...pickDefined({
          group_ids: ctx.input.groupIds,
          mailing_list_id: ctx.input.mailingListId,
          sms_sending_profile_id: ctx.input.smsSendingProfileId
        })
      };
    }
    if (
      ctx.input.isSent !== undefined ||
      ctx.input.scheduledDate !== undefined ||
      ctx.input.scheduledTimeZone !== undefined
    ) {
      data.scheduling = {
        ...data.scheduling,
        ...pickDefined({
          is_sent: ctx.input.isSent,
          scheduled_date: ctx.input.scheduledDate,
          scheduled_time_zone: ctx.input.scheduledTimeZone
        })
      };
    }
    await client.updateSmsCampaign(ctx.input.campaignId, data);
    return redactProviderData(
      {
        output: { success: true, campaignId: ctx.input.campaignId },
        message: 'Updated SMS campaign.'
      },
      ctx.auth.token
    );
  })
  .build();

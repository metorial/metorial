import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient, readId, readList, redactProviderData } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all reusable email templates from "My Templates". ActiveTrail returns the full list.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      templates: z.array(z.any()).describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listTemplates({ page: ctx.input.page, limit: ctx.input.limit });
    let templates = readList(result);
    return redactProviderData(
      {
        output: { templates },
        message: `Found **${templates.length}** template(s).`
      },
      ctx.auth.token
    );
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a template by ID, optionally including the full HTML content.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template'),
      includeContent: z.boolean().optional().describe('Include full template HTML content')
    })
  )
  .output(
    z.object({
      template: z.any().describe('Template details'),
      content: z.any().optional().describe('Template HTML content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let template = await client.getTemplate(ctx.input.templateId);
    let output: Record<string, any> = { template };

    if (ctx.input.includeContent) {
      output.content = await client.getTemplateContent(ctx.input.templateId);
    }

    return redactProviderData(
      {
        output: output as any,
        message: `Retrieved template **${ctx.input.templateId}**.`
      },
      ctx.auth.token
    );
  })
  .build();

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a new reusable email template in "My Templates".`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Template name'),
      subject: z.string().optional().describe('Default email subject'),
      content: z.string().optional().describe('HTML content of the template'),
      categoryId: z
        .number()
        .optional()
        .describe('Template category ID. Call list_template_categories to discover IDs.')
    })
  )
  .output(
    z.object({
      templateId: z
        .number()
        .optional()
        .describe('Created template ID when returned by ActiveTrail'),
      raw: z.any().describe('Original template response'),
      name: z.string().nullable().optional().describe('Template name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let data: Record<string, any> = {
      name: ctx.input.name,
      subject: ctx.input.subject,
      template_category_id: ctx.input.categoryId,
      content: ctx.input.content
    };
    let result = await client.createTemplate(data);

    return redactProviderData(
      {
        output: {
          templateId: result.id === undefined ? undefined : readId(result),
          name: result.name,
          raw: result
        },
        message: `Template **${ctx.input.name}** created.`
      },
      ctx.auth.token
    );
  })
  .build();

export let deleteTemplate = SlateTool.create(spec, {
  name: 'Delete Template',
  key: 'delete_template',
  description: `Delete an email template by ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.deleteTemplate(ctx.input.templateId);
    return redactProviderData(
      {
        output: { success: true },
        message: `Template **${ctx.input.templateId}** deleted.`
      },
      ctx.auth.token
    );
  })
  .build();

export let createCampaignFromTemplate = SlateTool.create(spec, {
  name: 'Create Campaign from Template',
  key: 'create_campaign_from_template',
  description: `Create a new email campaign directly from an existing template. Configures the campaign with the template's design and the provided sending settings.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to create campaign from'),
      name: z.string().describe('Campaign name'),
      subject: z.string().describe('Email subject line'),
      userProfileId: z.number().describe('Sending profile ID'),
      groupIds: z.array(z.number()).optional().describe('Group IDs to send to'),
      mailingListId: z.number().optional().describe('Mailing list ID to send to'),
      isSent: z
        .boolean()
        .optional()
        .describe('Whether to send/schedule (default false = draft)'),
      scheduledDateUtc: z.string().optional().describe('UTC date to schedule sending')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('Created campaign ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let data: Record<string, any> = {
      campaign_details: {
        name: ctx.input.name,
        subject: ctx.input.subject,
        user_profile_id: ctx.input.userProfileId
      }
    };

    let result = await client.createCampaignFromTemplate(ctx.input.templateId, data);
    let campaignId = readId(result);
    if (ctx.input.groupIds !== undefined || ctx.input.mailingListId !== undefined)
      await client.updateCampaignSegment(campaignId, {
        group_ids: ctx.input.groupIds,
        mailing_list_id: ctx.input.mailingListId
      });
    if (ctx.input.isSent !== undefined || ctx.input.scheduledDateUtc !== undefined)
      await client.updateCampaignScheduling(campaignId, {
        is_sent: ctx.input.isSent ?? false,
        scheduled_date_utc: ctx.input.scheduledDateUtc
      });
    return redactProviderData(
      {
        output: { campaignId },
        message: `Campaign created from template **${ctx.input.templateId}** with ID **${result.id}**.`
      },
      ctx.auth.token
    );
  })
  .build();

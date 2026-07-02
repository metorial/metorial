import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressFieldSchema = z.object({
  address: z.string().describe('Email address'),
  name: z.string().optional().describe('Display name')
});

let responseOutputSchema = z.object({
  responseId: z.string().describe('Response template ID'),
  title: z.string().optional().describe('Template title'),
  subject: z.string().optional().describe('Email subject'),
  body: z.string().optional().describe('HTML body content'),
  externalId: z.string().optional().describe('External system reference ID')
});

export let manageResponses = SlateTool.create(spec, {
  name: 'Manage Responses',
  key: 'manage_responses',
  description: `List, create, update, or delete canned response templates. Responses can be scoped to an organization or a personal user, shared with specific teams, and associated with shared labels.`,
  instructions: [
    'When creating, provide either organizationId (shared) or userId (personal) to scope the response.',
    'When updating attachments, include ALL attachments — the array replaces existing data.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      responseId: z
        .string()
        .optional()
        .describe('Response ID (required for get, update, delete)'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (for filtering on list, or scoping on create)'),
      userId: z.string().optional().describe('User ID (for personal response on create)'),
      title: z.string().optional().describe('Template title'),
      subject: z.string().optional().describe('Email subject'),
      body: z.string().optional().describe('HTML body content'),
      shareWithTeam: z.string().optional().describe('Team ID to share response with'),
      sharedLabelIds: z
        .array(z.string())
        .optional()
        .describe('Shared label IDs to auto-apply'),
      toFields: z.array(addressFieldSchema).optional().describe('Default To recipients'),
      ccFields: z.array(addressFieldSchema).optional().describe('Default CC recipients'),
      bccFields: z.array(addressFieldSchema).optional().describe('Default BCC recipients'),
      externalId: z.string().optional().describe('External system reference ID'),
      externalSource: z.string().optional().describe('External system name'),
      limit: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe('Max responses to return (list only)'),
      offset: z.number().optional().describe('Pagination offset (list only)')
    })
  )
  .output(
    z.object({
      responses: z.array(responseOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let params: Record<string, string | number> = {};
      if (ctx.input.organizationId) params.organization = ctx.input.organizationId;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.offset) params.offset = ctx.input.offset;

      let data = await client.listResponses(params);
      let responses = (data.responses || []).map((r: any) => ({
        responseId: r.id,
        title: r.title,
        subject: r.subject,
        body: r.body,
        externalId: r.external_id
      }));

      return {
        output: { responses },
        message: `Retrieved **${responses.length}** response templates.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.responseId) throw new Error('responseId is required');
      let data = await client.getResponse(ctx.input.responseId);
      let r = data.responses;
      return {
        output: {
          responses: [
            {
              responseId: r.id,
              title: r.title,
              subject: r.subject,
              body: r.body,
              externalId: r.external_id
            }
          ]
        },
        message: `Retrieved response **${r.title || r.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.responseId) throw new Error('responseId is required for delete');
      await client.deleteResponses([ctx.input.responseId]);
      return {
        output: { responses: [] },
        message: `Deleted response **${ctx.input.responseId}**.`
      };
    }

    let fields: Record<string, any> = {};
    if (ctx.input.title) fields.title = ctx.input.title;
    if (ctx.input.subject) fields.subject = ctx.input.subject;
    if (ctx.input.body) fields.body = ctx.input.body;
    if (ctx.input.shareWithTeam) fields.share_with_team = ctx.input.shareWithTeam;
    if (ctx.input.sharedLabelIds) fields.shared_labels = ctx.input.sharedLabelIds;
    if (ctx.input.toFields) fields.to_fields = ctx.input.toFields;
    if (ctx.input.ccFields) fields.cc_fields = ctx.input.ccFields;
    if (ctx.input.bccFields) fields.bcc_fields = ctx.input.bccFields;
    if (ctx.input.externalId) fields.external_id = ctx.input.externalId;
    if (ctx.input.externalSource) fields.external_source = ctx.input.externalSource;

    if (ctx.input.action === 'create') {
      if (ctx.input.organizationId) fields.organization = ctx.input.organizationId;
      if (ctx.input.userId) fields.user = ctx.input.userId;
      let data = await client.createResponses(fields);
      let responses = Array.isArray(data.responses) ? data.responses : [data.responses];
      return {
        output: {
          responses: responses.map((r: any) => ({
            responseId: r.id,
            title: r.title,
            subject: r.subject,
            body: r.body,
            externalId: r.external_id
          }))
        },
        message: `Created response **${ctx.input.title}**.`
      };
    }

    // update
    if (!ctx.input.responseId) throw new Error('responseId is required for update');
    let data = await client.updateResponses([ctx.input.responseId], fields);
    let responses = Array.isArray(data.responses) ? data.responses : [data.responses];
    return {
      output: {
        responses: responses.map((r: any) => ({
          responseId: r.id,
          title: r.title,
          subject: r.subject,
          body: r.body,
          externalId: r.external_id
        }))
      },
      message: `Updated response **${ctx.input.responseId}**.`
    };
  })
  .build();

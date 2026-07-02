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

export let manageTemplate = SlateTool.create(spec, {
  name: 'Manage Template',
  key: 'manage_template',
  description: `Create or update an email template in Outreach.
Templates are reusable email content used in sequences and one-off emails. They support subject, body, and personalization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update']).describe('Action to perform'),
      templateId: z.string().optional().describe('Template ID (required for update)'),
      name: z.string().optional().describe('Template name'),
      subject: z.string().optional().describe('Email subject line'),
      bodyHtml: z.string().optional().describe('HTML body content'),
      bodyText: z.string().optional().describe('Plain text body content'),
      shareType: z
        .enum(['private', 'read_only', 'shared'])
        .optional()
        .describe('Sharing level'),
      tags: z.array(z.string()).optional().describe('Tags'),
      ownerId: z.string().optional().describe('Owner user ID')
    })
  )
  .output(
    z.object({
      templateId: z.string(),
      name: z.string().optional(),
      subject: z.string().optional(),
      shareType: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let attributes = cleanAttributes({
      name: ctx.input.name,
      subject: ctx.input.subject,
      bodyHtml: ctx.input.bodyHtml,
      bodyText: ctx.input.bodyText,
      shareType: ctx.input.shareType,
      tags: ctx.input.tags
    });

    let relationships = mergeRelationships(buildRelationship('owner', ctx.input.ownerId));

    if (ctx.input.action === 'create') {
      let resource = await client.createTemplate(attributes, relationships);
      let flat = flattenResource(resource);
      return {
        output: {
          templateId: flat.id,
          name: flat.name,
          subject: flat.subject,
          shareType: flat.shareType,
          createdAt: flat.createdAt,
          updatedAt: flat.updatedAt
        },
        message: `Template **${flat.name}** created with ID ${flat.id}.`
      };
    }

    if (!ctx.input.templateId) throw new Error('templateId is required for update');
    let resource = await client.updateTemplate(ctx.input.templateId, attributes);
    let flat = flattenResource(resource);
    return {
      output: {
        templateId: flat.id,
        name: flat.name,
        subject: flat.subject,
        shareType: flat.shareType,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt
      },
      message: `Template **${flat.name}** (${flat.id}) updated successfully.`
    };
  })
  .build();

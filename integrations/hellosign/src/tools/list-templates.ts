import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List available signature request templates with pagination and optional search filtering. Returns template details including title, signer roles, and CC roles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default 1)'),
      pageSize: z.number().optional().describe('Results per page, 1-100 (default 20)'),
      query: z.string().optional().describe('Search query to filter templates')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique template identifier'),
            title: z.string().optional().describe('Template title'),
            message: z.string().optional().describe('Default message'),
            signerRoles: z
              .array(
                z.object({
                  name: z.string().describe('Role name'),
                  order: z.number().optional().describe('Signing order')
                })
              )
              .describe('Defined signer roles'),
            ccRoles: z
              .array(
                z.object({
                  name: z.string().describe('CC role name')
                })
              )
              .describe('Defined CC roles'),
            canEdit: z.boolean().describe('Whether you can edit this template')
          })
        )
        .describe('List of templates'),
      page: z.number().describe('Current page'),
      numPages: z.number().describe('Total pages'),
      numResults: z.number().describe('Total results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let result = await client.listTemplates({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      query: ctx.input.query
    });

    let templates = result.templates.map((t: any) => ({
      templateId: t.template_id,
      title: t.title,
      message: t.message,
      signerRoles: (t.signer_roles || []).map((r: any) => ({
        name: r.name,
        order: r.order
      })),
      ccRoles: (t.cc_roles || []).map((r: any) => ({
        name: r.name
      })),
      canEdit: t.can_edit ?? false
    }));

    return {
      output: {
        templates,
        page: result.listInfo.page,
        numPages: result.listInfo.numPages,
        numResults: result.listInfo.numResults
      },
      message: `Found **${result.listInfo.numResults}** template(s). Showing page ${result.listInfo.page} of ${result.listInfo.numPages}.`
    };
  })
  .build();

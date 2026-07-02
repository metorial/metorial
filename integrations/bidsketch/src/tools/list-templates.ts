import { SlateTool } from 'slates';
import { z } from 'zod';
import { BidsketchClient } from '../lib/client';
import { spec } from '../spec';

let templateSummarySchema = z.object({
  templateId: z.number().describe('Unique template ID'),
  name: z.string().describe('Template name'),
  url: z.string().describe('API URL'),
  appUrl: z.string().describe('Bidsketch app URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve saved proposal templates from Bidsketch. Templates can be used as starting points when creating new proposals. Use the template ID with the "Create Proposal" tool to create a proposal from a template.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of templates per page (max 100)')
    })
  )
  .output(
    z.object({
      templates: z.array(templateSummarySchema).describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let data = await client.listTemplates(ctx.input.page, ctx.input.perPage);

    let templates = (Array.isArray(data) ? data : []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      url: t.url,
      appUrl: t.app_url,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve detailed information about a specific proposal template, including its sections and fees. Useful for previewing template content before creating a proposal from it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.number().describe('Template ID'),
      name: z.string().describe('Template name'),
      sections: z
        .array(
          z.object({
            sectionId: z.number(),
            name: z.string(),
            sectionType: z.string(),
            url: z.string(),
            appUrl: z.string()
          })
        )
        .describe('Template sections'),
      fees: z
        .array(
          z.object({
            feeId: z.number(),
            name: z.string(),
            feeType: z.string(),
            url: z.string(),
            appUrl: z.string()
          })
        )
        .describe('Template fees'),
      url: z.string().describe('API URL'),
      appUrl: z.string().describe('Bidsketch app URL'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BidsketchClient(ctx.auth.token);
    let t = await client.getTemplate(ctx.input.templateId);

    let sections = (t.sections || []).map((s: any) => ({
      sectionId: s.id,
      name: s.name,
      sectionType: s.sectiontype,
      url: s.url,
      appUrl: s.app_url
    }));

    let fees = (t.fees || []).map((f: any) => ({
      feeId: f.id,
      name: f.name,
      feeType: f.feetype,
      url: f.url,
      appUrl: f.app_url
    }));

    return {
      output: {
        templateId: t.id,
        name: t.name,
        sections,
        fees,
        url: t.url,
        appUrl: t.app_url,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      },
      message: `Retrieved template **${t.name}** with ${sections.length} section(s) and ${fees.length} fee(s).`
    };
  })
  .build();

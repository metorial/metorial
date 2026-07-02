import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBrandTemplates = SlateTool.create(spec, {
  name: 'List Brand Templates',
  key: 'list_brand_templates',
  description: `List brand templates available to the user. Supports searching by query, filtering by ownership, and pagination. Requires the user to be a member of a Canva Enterprise organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter templates'),
      ownership: z
        .enum(['any', 'owned', 'shared'])
        .optional()
        .describe('Filter by ownership type'),
      sortBy: z
        .enum([
          'relevance',
          'modified_descending',
          'modified_ascending',
          'title_descending',
          'title_ascending'
        ])
        .optional()
        .describe('Sort order'),
      dataset: z
        .enum(['any', 'non_empty'])
        .optional()
        .describe('Filter by dataset: "non_empty" for templates that support autofill'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default 25)'),
      continuation: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            brandTemplateId: z.string(),
            title: z.string().optional(),
            viewUrl: z.string().optional(),
            createUrl: z.string().optional(),
            createdAt: z.number(),
            updatedAt: z.number(),
            thumbnailUrl: z.string().optional()
          })
        )
        .describe('List of brand templates'),
      continuation: z.string().optional().describe('Token for retrieving the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBrandTemplates({
      query: ctx.input.query,
      ownership: ctx.input.ownership,
      sortBy: ctx.input.sortBy,
      dataset: ctx.input.dataset,
      limit: ctx.input.limit,
      continuation: ctx.input.continuation
    });

    return {
      output: result,
      message: `Found **${result.templates.length}** brand templates.${result.continuation ? ' More results available.' : ''}`
    };
  })
  .build();

export let getBrandTemplate = SlateTool.create(spec, {
  name: 'Get Brand Template',
  key: 'get_brand_template',
  description: `Retrieve metadata and autofill dataset for a brand template. Returns template details and the list of data fields that can be populated via autofill. Requires Canva Enterprise.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandTemplateId: z.string().describe('The brand template ID'),
      includeDataset: z
        .boolean()
        .optional()
        .describe('Whether to also fetch the autofill dataset for this template')
    })
  )
  .output(
    z.object({
      brandTemplateId: z.string().describe('The brand template ID'),
      title: z.string().optional().describe('Template title'),
      viewUrl: z.string().optional().describe('URL to view the template'),
      createUrl: z.string().optional().describe('URL to create designs from the template'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      updatedAt: z.number().describe('Unix timestamp of last modification'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
      dataset: z
        .record(
          z.string(),
          z.object({
            type: z.string().describe('Field type: "image", "text", or "chart"')
          })
        )
        .optional()
        .describe('Autofill dataset fields (when includeDataset is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let template = await client.getBrandTemplate(ctx.input.brandTemplateId);

    let dataset: Record<string, { type: string }> | undefined;
    if (ctx.input.includeDataset) {
      dataset = await client.getBrandTemplateDataset(ctx.input.brandTemplateId);
    }

    return {
      output: { ...template, dataset },
      message: `Retrieved brand template **${template.title || template.brandTemplateId}**.${dataset ? ` ${Object.keys(dataset).length} autofill field(s).` : ''}`
    };
  })
  .build();

export let autofillBrandTemplate = SlateTool.create(spec, {
  name: 'Autofill Brand Template',
  key: 'autofill_brand_template',
  description: `Create a design by populating a brand template with dynamic data. Provide key-value pairs matching the template's dataset fields. This starts an asynchronous autofill job. Requires Canva Enterprise.`,
  instructions: [
    'Use "Get Brand Template" with includeDataset=true to discover available fields and their types.',
    'For text fields, use: { "type": "text", "text": "your value" }',
    'For image fields, use: { "type": "image", "asset_id": "your_asset_id" }'
  ]
})
  .input(
    z.object({
      brandTemplateId: z.string().describe('The brand template ID to autofill'),
      fields: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs of data fields to fill. Keys must match the template dataset field names.'
        ),
      title: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('Title for the generated design (defaults to the template title)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The autofill job ID'),
      status: z.string().describe('Job status: "in_progress", "success", or "failed"'),
      design: z
        .object({
          designId: z.string(),
          title: z.string().optional(),
          editUrl: z.string().optional(),
          viewUrl: z.string().optional(),
          createdAt: z.number(),
          updatedAt: z.number()
        })
        .optional()
        .describe('The generated design (present when status is "success")'),
      errorCode: z.string().optional().describe('Error code if the autofill failed'),
      errorMessage: z.string().optional().describe('Error message if the autofill failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.createAutofillJob({
      brandTemplateId: ctx.input.brandTemplateId,
      data: ctx.input.fields,
      title: ctx.input.title
    });

    let statusMsg =
      job.status === 'success'
        ? `Autofill completed. Design created: **${job.design?.title || job.design?.designId}**.`
        : job.status === 'failed'
          ? `Autofill failed: ${job.errorMessage || job.errorCode}`
          : `Autofill job started (ID: ${job.jobId}). Poll for completion.`;

    return {
      output: job,
      message: statusMsg
    };
  })
  .build();

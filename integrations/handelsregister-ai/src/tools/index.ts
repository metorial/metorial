import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { HandelsregisterClient } from '../lib/client';
import { parseResponse } from '../lib/response';
import {
  accountOutputSchema,
  documentInputSchema,
  fileSchema,
  personSchema,
  searchInputSchema,
  searchOutputSchema
} from '../lib/schemas';
import { spec } from '../spec';
import {
  annualStatementTools,
  companyDataTools,
  companyOverviewTool,
  websiteContentTool
} from './company';

export const searchOrganizationsTool = SlateTool.create(spec, {
  key: 'search_organizations',
  name: 'Search Organizations',
  description:
    'Search German companies by name, register data, location, ownership, or financial filters. Returns entity_id values for exact company retrieval and document downloads. One explicit page per invocation.',
  tags: { readOnly: true },
  constraints: [
    'Each page costs 1 credit. Maximum 30 results per page; pass next_skip as skip to continue.'
  ]
})
  .input(searchInputSchema)
  .output(searchOutputSchema)
  .handleInvocation(async ctx => {
    let data = parseResponse(
      searchOutputSchema.omit({ skip: true, limit: true, next_skip: true }),
      await new HandelsregisterClient(ctx.auth).search(ctx.input)
    );
    let next = ctx.input.skip + data.results.length;
    return {
      output: {
        ...data,
        skip: ctx.input.skip,
        limit: ctx.input.limit,
        ...(data.results.length && next < data.total ? { next_skip: next } : {})
      },
      message: `Found ${data.results.length} companies on this page.`
    };
  })
  .build();

export const fetchPersonTool = SlateTool.create(spec, {
  key: 'fetch_person',
  name: 'Fetch Person',
  description:
    'Find a person using their name and company context, merging commercial-register roles with AI-enriched public information. Optionally retrieve their company shareholdings.',
  tags: { readOnly: true },
  constraints: [
    'Requires an active Plus, Pro, or Max subscription. Costs 15 credits including AI enrichment, plus 5 for shareholdings when data is returned.'
  ]
})
  .input(
    z.object({
      person_q: z.string().trim().min(2).describe('Person name; at least two characters.'),
      organization_q: z
        .string()
        .trim()
        .min(2)
        .describe(
          'Company context to distinguish people with the same name. Use a known company name or entity_id.'
        ),
      feature: z
        .array(z.literal('shareholdings'))
        .max(1)
        .optional()
        .describe(
          'Optional extra feature: shareholdings. Adds 5 credits when holdings are returned.'
        )
    })
  )
  .output(personSchema)
  .handleInvocation(async ctx => ({
    output: parseResponse(
      personSchema,
      await new HandelsregisterClient(ctx.auth).person(ctx.input)
    ),
    message: 'Retrieved the person profile.'
  }))
  .build();

export const fetchDocumentTool = SlateTool.create(spec, {
  key: 'fetch_document',
  name: 'Download Register Document',
  description:
    'Download an official German register document as PDF, or structured register content as XML. First use search_organizations to get the exact company_id.',
  tags: { readOnly: true },
  constraints: ['Costs 15 credits per document. Rate limit: five requests per minute.']
})
  .input(documentInputSchema)
  .output(
    z.object({
      company_id: z.string(),
      document_type: documentInputSchema.shape.document_type,
      file: fileSchema
    })
  )
  .handleInvocation(async ctx => {
    let { content, mimeType } = await new HandelsregisterClient(ctx.auth).document(ctx.input);
    let fileName = `${ctx.input.company_id.replace(/[^a-zA-Z0-9_-]/g, '_')}-${ctx.input.document_type}.${ctx.input.document_type === 'SI' ? 'xml' : 'pdf'}`;
    return {
      output: { ...ctx.input, file: { fileName, mimeType, byteSize: content.length } },
      message: `**${fileName}** is ready to download.`,
      attachments: [createBase64Attachment(content.toString('base64'), mimeType)]
    };
  })
  .build();

export const getAccountTool = SlateTool.create(spec, {
  key: 'get_account',
  name: 'Get Account',
  description:
    'Read the connected Handelsregister.ai account profile, including identity and plan information. This request is free.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(accountOutputSchema)
  .handleInvocation(async ctx => ({
    output: await new HandelsregisterClient(ctx.auth).account(),
    message: 'Retrieved the connected account profile.'
  }))
  .build();

export const tools = [
  searchOrganizationsTool,
  companyOverviewTool,
  ...companyDataTools,
  ...annualStatementTools,
  websiteContentTool,
  fetchPersonTool,
  fetchDocumentTool,
  getAccountTool
];

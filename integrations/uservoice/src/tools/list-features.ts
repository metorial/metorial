import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let featureSchema = z.object({
  featureId: z.number().describe('Unique ID of the feature'),
  name: z.string().describe('Name of the feature'),
  description: z.string().nullable().describe('Description of the feature'),
  isBlocker: z.boolean().describe('Whether this feature is marked as a blocker'),
  suggestionsCount: z.number().describe('Number of linked suggestions'),
  supportingUsersCount: z.number().describe('Number of users supporting linked suggestions'),
  supportingAccountsCount: z
    .number()
    .describe('Number of accounts supporting linked suggestions'),
  createdAt: z.string().describe('When the feature was created'),
  updatedAt: z.string().describe('When the feature was last updated'),
  links: z
    .record(z.string(), z.any())
    .optional()
    .describe('Associated resource links (feature_status, product_area, etc.)')
});

export let listFeatures = SlateTool.create(spec, {
  name: 'List Features',
  key: 'list_features',
  description: `List features (roadmap items) in your UserVoice account. Features represent planned product changes that can be linked to suggestions for roadmap planning.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field. Examples: "-created_at", "-supporting_users_count"')
    })
  )
  .output(
    z.object({
      features: z.array(featureSchema),
      totalRecords: z.number().describe('Total number of features'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listFeatures({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort
    });

    let features = result.features.map((f: any) => ({
      featureId: f.id,
      name: f.name,
      description: f.description || null,
      isBlocker: f.is_blocker ?? false,
      suggestionsCount: f.suggestions_count || 0,
      supportingUsersCount: f.supporting_users_count || 0,
      supportingAccountsCount: f.supporting_accounts_count || 0,
      createdAt: f.created_at,
      updatedAt: f.updated_at,
      links: f.links
    }));

    return {
      output: {
        features,
        totalRecords: result.pagination?.totalRecords || 0,
        totalPages: result.pagination?.totalPages || 0
      },
      message: `Found **${features.length}** features.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { metaAdsServiceError } from '../lib/errors';
import { spec } from '../spec';

let audienceSchema = z.object({
  audienceId: z.string().describe('Custom audience ID'),
  name: z.string().optional().describe('Audience name'),
  description: z.string().optional().describe('Audience description'),
  subtype: z
    .string()
    .optional()
    .describe('Audience subtype (CUSTOM, WEBSITE, LOOKALIKE, etc.)'),
  approximateCountLowerBound: z
    .number()
    .optional()
    .describe('Approximate lower bound of audience size'),
  approximateCountUpperBound: z
    .number()
    .optional()
    .describe('Approximate upper bound of audience size'),
  deliveryStatus: z
    .any()
    .optional()
    .describe('Delivery status (code 200=active, 300=too small, 400+=unusable)'),
  operationStatus: z.any().optional().describe('Operation status'),
  timeCreated: z.string().optional().describe('Creation timestamp'),
  timeUpdated: z.string().optional().describe('Last update timestamp')
});

let validateAudienceRows = (schema: string[], userData: string[][]) => {
  for (let [index, row] of userData.entries()) {
    if (row.length !== schema.length) {
      throw metaAdsServiceError(
        `userData row ${index + 1} has ${row.length} values but schema has ${schema.length} fields.`
      );
    }
  }
};

export let listCustomAudiences = SlateTool.create(spec, {
  name: 'List Custom Audiences',
  key: 'list_custom_audiences',
  description: `Retrieve custom audiences from the ad account. Custom audiences enable targeting specific groups of people based on customer data, website traffic, app activity, or engagement.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max number of audiences to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      audiences: z.array(audienceSchema),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getCustomAudiences({
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let audiences = (result.data || []).map((a: any) => ({
      audienceId: a.id,
      name: a.name,
      description: a.description,
      subtype: a.subtype,
      approximateCountLowerBound: a.approximate_count_lower_bound,
      approximateCountUpperBound: a.approximate_count_upper_bound,
      deliveryStatus: a.delivery_status,
      operationStatus: a.operation_status,
      timeCreated: a.time_created,
      timeUpdated: a.time_updated
    }));

    return {
      output: {
        audiences,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${audiences.length}** custom audiences.`
    };
  })
  .build();

export let getCustomAudience = SlateTool.create(spec, {
  name: 'Get Custom Audience',
  key: 'get_custom_audience',
  description: `Retrieve detailed information about a specific custom audience.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      audienceId: z.string().describe('The custom audience ID to retrieve')
    })
  )
  .output(audienceSchema)
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let a = await client.getCustomAudience(ctx.input.audienceId);

    return {
      output: {
        audienceId: a.id,
        name: a.name,
        description: a.description,
        subtype: a.subtype,
        approximateCountLowerBound: a.approximate_count_lower_bound,
        approximateCountUpperBound: a.approximate_count_upper_bound,
        deliveryStatus: a.delivery_status,
        operationStatus: a.operation_status,
        timeCreated: a.time_created,
        timeUpdated: a.time_updated
      },
      message: `Retrieved custom audience **${a.name}** (${a.id}).`
    };
  })
  .build();

export let removeUsersFromAudience = SlateTool.create(spec, {
  name: 'Remove Users from Audience',
  key: 'remove_users_from_audience',
  description: `Remove users from an existing custom audience using the same SHA-256 hashed identifier schema used for uploads.`,
  instructions: [
    'Use the same schema and hashed values that were uploaded to the custom audience.',
    'All PII values must be SHA-256 hashed before including them.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      audienceId: z.string().describe('Custom audience ID to remove users from'),
      schema: z
        .array(z.string())
        .describe(
          'Array of field names in the data (e.g., ["EMAIL", "PHONE", "FN", "LN", "COUNTRY"])'
        ),
      userData: z
        .array(z.array(z.string()))
        .describe(
          'Array of user records, each an array of SHA-256 hashed values matching the schema order'
        )
    })
  )
  .output(
    z.object({
      audienceId: z.string().describe('The audience ID'),
      numReceived: z.number().optional().describe('Number of records received'),
      numInvalid: z.number().optional().describe('Number of invalid records')
    })
  )
  .handleInvocation(async ctx => {
    validateAudienceRows(ctx.input.schema, ctx.input.userData);

    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.removeUsersFromCustomAudience(ctx.input.audienceId, {
      payload: JSON.stringify({
        schema: ctx.input.schema,
        data: ctx.input.userData
      })
    });

    return {
      output: {
        audienceId: ctx.input.audienceId,
        numReceived: result.num_received,
        numInvalid: result.num_invalid_entries
      },
      message: `Removed users from audience \`${ctx.input.audienceId}\`: **${result.num_received || 0}** received, **${result.num_invalid_entries || 0}** invalid.`
    };
  })
  .build();

export let createCustomAudience = SlateTool.create(spec, {
  name: 'Create Custom Audience',
  key: 'create_custom_audience',
  description: `Create a new custom audience. After creation, add users to it using the "Add Users to Audience" tool. You can create up to 500 custom audiences per ad account.`,
  instructions: [
    'After creating the audience, use the Add Users to Audience tool to populate it.',
    'You must accept Meta Custom Audience Terms of Service in Ads Manager before using this feature.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Audience name'),
      description: z.string().optional().describe('Audience description'),
      subtype: z
        .enum(['CUSTOM', 'WEBSITE', 'LOOKALIKE', 'ENGAGEMENT'])
        .default('CUSTOM')
        .describe('Audience subtype'),
      customerFileSource: z
        .enum([
          'USER_PROVIDED_ONLY',
          'PARTNER_PROVIDED_ONLY',
          'BOTH_USER_AND_PARTNER_PROVIDED'
        ])
        .optional()
        .describe('Source of customer data (required for CUSTOM subtype)'),
      lookalikeSpec: z
        .object({
          originAudienceId: z.string().describe('Source audience ID'),
          targetCountries: z.array(z.string()).describe('Target countries (ISO codes)'),
          ratio: z
            .number()
            .min(0.01)
            .max(0.2)
            .describe('Lookalike ratio (0.01-0.20, where 0.01 = top 1%)')
        })
        .optional()
        .describe('Configuration for lookalike audiences'),
      rule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Rule-based audience definition (for WEBSITE subtype, uses pixel data)')
    })
  )
  .output(
    z.object({
      audienceId: z.string().describe('ID of the newly created audience')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.subtype === 'CUSTOM' && !ctx.input.customerFileSource) {
      throw metaAdsServiceError(
        'customerFileSource is required when creating a CUSTOM customer-list audience.'
      );
    }

    if (ctx.input.subtype === 'LOOKALIKE' && !ctx.input.lookalikeSpec) {
      throw metaAdsServiceError(
        'lookalikeSpec is required when creating a LOOKALIKE audience.'
      );
    }

    if (ctx.input.subtype !== 'LOOKALIKE' && ctx.input.lookalikeSpec) {
      throw metaAdsServiceError('lookalikeSpec can only be used with subtype LOOKALIKE.');
    }

    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let params: Record<string, any> = {
      name: ctx.input.name,
      subtype: ctx.input.subtype
    };

    if (ctx.input.description) params.description = ctx.input.description;
    if (ctx.input.customerFileSource)
      params.customer_file_source = ctx.input.customerFileSource;

    if (ctx.input.lookalikeSpec) {
      params.lookalike_spec = JSON.stringify({
        origin: [{ type: 'custom_audience', id: ctx.input.lookalikeSpec.originAudienceId }],
        target_countries: ctx.input.lookalikeSpec.targetCountries,
        ratio: ctx.input.lookalikeSpec.ratio
      });
    }

    if (ctx.input.rule) params.rule = JSON.stringify(ctx.input.rule);

    let result = await client.createCustomAudience(params);

    return {
      output: {
        audienceId: result.id
      },
      message: `Created custom audience **${ctx.input.name}** with ID \`${result.id}\`.`
    };
  })
  .build();

export let addUsersToAudience = SlateTool.create(spec, {
  name: 'Add Users to Audience',
  key: 'add_users_to_audience',
  description: `Add users to an existing custom audience using hashed identifiers. All PII (emails, phone numbers, etc.) must be SHA-256 hashed before sending. Meta will match these against their user database.`,
  instructions: [
    'All PII values must be SHA-256 hashed before including them.',
    'Emails should be lowercased and trimmed before hashing.',
    'Phone numbers should include country code, no dashes or symbols, before hashing.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      audienceId: z.string().describe('Custom audience ID to add users to'),
      schema: z
        .array(z.string())
        .describe(
          'Array of field names in the data (e.g., ["EMAIL", "PHONE", "FN", "LN", "COUNTRY"])'
        ),
      userData: z
        .array(z.array(z.string()))
        .describe(
          'Array of user records, each an array of SHA-256 hashed values matching the schema order'
        )
    })
  )
  .output(
    z.object({
      audienceId: z.string().describe('The audience ID'),
      numReceived: z.number().optional().describe('Number of records received'),
      numInvalid: z.number().optional().describe('Number of invalid records')
    })
  )
  .handleInvocation(async ctx => {
    validateAudienceRows(ctx.input.schema, ctx.input.userData);

    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.addUsersToCustomAudience(ctx.input.audienceId, {
      payload: JSON.stringify({
        schema: ctx.input.schema,
        data: ctx.input.userData
      })
    });

    return {
      output: {
        audienceId: ctx.input.audienceId,
        numReceived: result.num_received,
        numInvalid: result.num_invalid_entries
      },
      message: `Added users to audience \`${ctx.input.audienceId}\`: **${result.num_received || 0}** received, **${result.num_invalid_entries || 0}** invalid.`
    };
  })
  .build();

export let deleteCustomAudience = SlateTool.create(spec, {
  name: 'Delete Custom Audience',
  key: 'delete_custom_audience',
  description: `Delete a custom audience. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      audienceId: z.string().describe('ID of the audience to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.deleteCustomAudience(ctx.input.audienceId);

    return {
      output: {
        success: result.success !== false
      },
      message: `Deleted custom audience \`${ctx.input.audienceId}\`.`
    };
  })
  .build();

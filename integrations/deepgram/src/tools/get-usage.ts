import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

let balanceSchema = z.object({
  balanceId: z.string().describe('Unique balance identifier.'),
  amount: z.number().optional().describe('Balance amount.'),
  units: z.string().optional().describe('Balance units.'),
  purchase: z.any().optional().describe('Purchase details.')
});

let projectRequestSchema = z.object({
  requestId: z.string().optional().describe('Unique request identifier.'),
  projectId: z.string().optional().describe('Project identifier.'),
  created: z.string().optional().describe('Request creation timestamp.'),
  path: z.string().optional().describe('API path used by the request.'),
  apiKeyId: z.string().optional().describe('API key identifier used by the request.'),
  code: z.number().optional().describe('HTTP response code.'),
  deployment: z.string().optional().describe('Deployment type.'),
  callback: z.string().optional().describe('Callback URL if one was used.'),
  response: z.any().optional().describe('Recorded response details.')
});

let deploymentSchema = z.enum(['hosted', 'beta', 'self-hosted']);
let endpointSchema = z.enum(['listen', 'read', 'speak', 'agent']);
let methodSchema = z.enum(['sync', 'async', 'streaming']);
let usageGroupingSchema = z.enum([
  'accessor',
  'endpoint',
  'feature_set',
  'models',
  'method',
  'tags',
  'deployment'
]);
let usageFeatureSchema = z.enum([
  'alternatives',
  'callback',
  'callback_method',
  'channels',
  'custom_intent',
  'custom_intent_mode',
  'custom_topic',
  'custom_topic_mode',
  'detect_entities',
  'detect_language',
  'diarize',
  'dictation',
  'encoding',
  'extra',
  'filler_words',
  'intents',
  'keyterm',
  'keywords',
  'language',
  'measurements',
  'multichannel',
  'numerals',
  'paragraphs',
  'profanity_filter',
  'punctuate',
  'redact',
  'replace',
  'sample_rate',
  'search',
  'sentiment',
  'smart_format',
  'summarize',
  'topics',
  'utt_split',
  'utterances',
  'version'
]);
let billingGroupingSchema = z.enum(['accessor', 'deployment', 'line_item', 'tags']);

let toBalance = (b: any): z.infer<typeof balanceSchema> => ({
  balanceId: b.balance_id || b.balanceId || b.id || '',
  amount: b.amount,
  units: b.units,
  purchase: b.purchase
});

let toProjectRequest = (request: any): z.infer<typeof projectRequestSchema> => ({
  requestId: request.request_id,
  projectId: request.project_uuid || request.project_id,
  created: request.created,
  path: request.path,
  apiKeyId: request.api_key_id,
  code: request.code,
  deployment: request.deployment,
  callback: request.callback,
  response: request.response
});

export let getUsageTool = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Get usage data for a Deepgram project. Filter by date range, API key, tag, method, or model. Useful for monitoring API consumption and billing.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format.'),
      accessor: z.string().optional().describe('Filter by API key ID.'),
      tag: z.string().optional().describe('Filter by request tag.'),
      method: z
        .string()
        .optional()
        .describe('Filter by method, for example "sync", "async", or "streaming".'),
      model: z.string().optional().describe('Filter by model name.')
    })
  )
  .output(
    z.object({
      usage: z.any().describe('Usage data breakdown.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getUsage(ctx.input.projectId, {
      start: ctx.input.start,
      end: ctx.input.end,
      accessor: ctx.input.accessor,
      tag: ctx.input.tag,
      method: ctx.input.method,
      model: ctx.input.model
    });

    return {
      output: { usage: result },
      message: `Retrieved usage data for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getUsageFieldsTool = SlateTool.create(spec, {
  name: 'Get Usage Fields',
  key: 'get_usage_fields',
  description: `Get available usage breakdown fields for a Deepgram project and optional date range. Use this before building detailed usage filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format.')
    })
  )
  .output(
    z.object({
      fields: z.any().describe('Deepgram usage field metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getUsageFields(ctx.input.projectId, {
      start: ctx.input.start,
      end: ctx.input.end
    });

    return {
      output: { fields: result },
      message: `Retrieved usage fields for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let listProjectRequestsTool = SlateTool.create(spec, {
  name: 'List Project Requests',
  key: 'list_project_requests',
  description: `List individual Deepgram API requests for a project. Useful for request-level troubleshooting, audit trails, and correlating tagged calls with usage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format.'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of requests to return. Deepgram documents 1-1000.'),
      status: z
        .enum(['succeeded', 'failed'])
        .optional()
        .describe('Optional filter for successful or failed requests.')
    })
  )
  .output(
    z.object({
      requests: z.array(projectRequestSchema).describe('Project request records.'),
      metadata: z.any().optional().describe('Additional pagination or response metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listProjectRequests(ctx.input.projectId, {
      start: ctx.input.start,
      end: ctx.input.end,
      limit: ctx.input.limit,
      status: ctx.input.status
    });
    let requests = result.requests || result.project_requests || result.items || [];
    let mappedRequests = requests.map(toProjectRequest);

    return {
      output: {
        requests: mappedRequests,
        metadata: result
      },
      message: `Retrieved **${mappedRequests.length}** request record(s) for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getProjectRequestTool = SlateTool.create(spec, {
  name: 'Get Project Request',
  key: 'get_project_request',
  description: `Get details for a single Deepgram request by request ID. Useful for troubleshooting failed calls returned by list_project_requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      requestId: z.string().describe('ID of the request to retrieve.')
    })
  )
  .output(
    z.object({
      request: projectRequestSchema.describe('Deepgram request record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getProjectRequest(ctx.input.projectId, ctx.input.requestId);
    let request = toProjectRequest(result.request || result);

    return {
      output: {
        request
      },
      message: `Retrieved request **${request.requestId || ctx.input.requestId}**.`
    };
  })
  .build();

export let getUsageBreakdownTool = SlateTool.create(spec, {
  name: 'Get Usage Breakdown',
  key: 'get_usage_breakdown',
  description: `Get grouped usage metrics for a Deepgram project, optionally filtered by dates, endpoint, method, model, tag, deployment, accessor, or documented feature flags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format.'),
      grouping: usageGroupingSchema.optional().describe('Dimension to group usage by.'),
      accessor: z.string().optional().describe('Filter by API key/accessor ID.'),
      tag: z.string().optional().describe('Filter by request tag.'),
      method: methodSchema.optional().describe('Filter by request method.'),
      model: z.string().optional().describe('Filter by model UUID.'),
      endpoint: endpointSchema.optional().describe('Filter by Deepgram API endpoint.'),
      deployment: deploymentSchema.optional().describe('Filter by deployment type.'),
      featuresUsed: z
        .array(usageFeatureSchema)
        .optional()
        .describe('Feature filters to set true, such as "diarize" or "smart_format".')
    })
  )
  .output(
    z.object({
      usageBreakdown: z.any().describe('Deepgram usage breakdown response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getUsageBreakdown(ctx.input.projectId, {
      start: ctx.input.start,
      end: ctx.input.end,
      grouping: ctx.input.grouping,
      accessor: ctx.input.accessor,
      tag: ctx.input.tag,
      method: ctx.input.method,
      model: ctx.input.model,
      endpoint: ctx.input.endpoint,
      deployment: ctx.input.deployment,
      featuresUsed: ctx.input.featuresUsed
    });

    return {
      output: { usageBreakdown: result },
      message: `Retrieved usage breakdown for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getBalancesTool = SlateTool.create(spec, {
  name: 'Get Balances',
  key: 'get_balances',
  description: `Get billing balance information for a Deepgram project. Returns available credits and balance details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.')
    })
  )
  .output(
    z.object({
      balances: z.array(balanceSchema).describe('List of balances.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getBalances(ctx.input.projectId);
    let balances = (result.balances || []).map(toBalance);

    return {
      output: { balances },
      message: `Found **${balances.length}** balance(s) for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getBalanceTool = SlateTool.create(spec, {
  name: 'Get Balance',
  key: 'get_balance',
  description: `Get one Deepgram billing balance by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      balanceId: z.string().describe('ID of the balance.')
    })
  )
  .output(balanceSchema)
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getBalance(ctx.input.projectId, ctx.input.balanceId);
    let balance = toBalance(result.balance || result);

    return {
      output: balance,
      message: `Retrieved balance **${balance.balanceId || ctx.input.balanceId}**.`
    };
  })
  .build();

export let getBillingBreakdownTool = SlateTool.create(spec, {
  name: 'Get Billing Breakdown',
  key: 'get_billing_breakdown',
  description: `Get grouped billing metrics for a Deepgram project, optionally filtered by dates, accessor, deployment, tag, line item, or billing grouping dimensions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format.'),
      accessor: z.string().optional().describe('Filter by API key/accessor ID.'),
      deployment: deploymentSchema.optional().describe('Filter by deployment type.'),
      tag: z.string().optional().describe('Filter by request tag.'),
      lineItem: z
        .string()
        .optional()
        .describe('Filter by Deepgram billing line item, for example "streaming::nova-3".'),
      grouping: z
        .array(billingGroupingSchema)
        .optional()
        .describe('Dimensions to group billing by.')
    })
  )
  .output(
    z.object({
      billingBreakdown: z.any().describe('Deepgram billing breakdown response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getBillingBreakdown(ctx.input.projectId, {
      start: ctx.input.start,
      end: ctx.input.end,
      accessor: ctx.input.accessor,
      deployment: ctx.input.deployment,
      tag: ctx.input.tag,
      lineItem: ctx.input.lineItem,
      grouping: ctx.input.grouping
    });

    return {
      output: { billingBreakdown: result },
      message: `Retrieved billing breakdown for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getBillingFieldsTool = SlateTool.create(spec, {
  name: 'Get Billing Fields',
  key: 'get_billing_fields',
  description: `List billing filter fields available for a Deepgram project and optional date range, including accessors, deployments, tags, and line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      start: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      end: z.string().optional().describe('End date in YYYY-MM-DD format.')
    })
  )
  .output(
    z.object({
      billingFields: z.any().describe('Deepgram billing field metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getBillingFields(ctx.input.projectId, {
      start: ctx.input.start,
      end: ctx.input.end
    });

    return {
      output: { billingFields: result },
      message: `Retrieved billing fields for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let listPurchasesTool = SlateTool.create(spec, {
  name: 'List Purchases',
  key: 'list_purchases',
  description: `List purchase/order records for a Deepgram project. Useful for billing reconciliation and balance audit workflows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of purchases to return. Deepgram documents 1-1000.')
    })
  )
  .output(
    z.object({
      purchases: z.array(z.any()).describe('Project purchase/order records.'),
      metadata: z.any().optional().describe('Raw Deepgram purchases response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listPurchases(ctx.input.projectId, {
      limit: ctx.input.limit
    });
    let purchases = result.orders || result.purchases || [];

    return {
      output: {
        purchases,
        metadata: result
      },
      message: `Retrieved **${purchases.length}** purchase record(s) for project **${ctx.input.projectId}**.`
    };
  })
  .build();

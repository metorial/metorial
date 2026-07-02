import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { clickhouseServiceError } from '../lib/errors';
import { spec } from '../spec';

let clickpipeSummarySchema = z.object({
  clickpipeId: z.string().describe('Unique ClickPipe identifier'),
  serviceId: z.string().optional(),
  name: z.string().optional().describe('Name of the ClickPipe'),
  state: z.string().optional().describe('Current state (running, paused, stopped)'),
  scaling: z
    .object({
      replicas: z.number().optional(),
      concurrency: z.number().optional(),
      replicaCpuMillicores: z.number().optional(),
      replicaMemoryGb: z.number().optional()
    })
    .optional()
    .describe('Scaling configuration'),
  source: z.record(z.string(), z.any()).optional().describe('Source configuration')
});

let ensureBodyHasFields = (body: Record<string, any>, label: string) => {
  if (Object.keys(body).length === 0) {
    throw clickhouseServiceError(`Provide at least one ${label} field to update.`);
  }
};

let scalingSchema = z.object({
  replicas: z
    .number()
    .int()
    .min(1)
    .max(40)
    .nullable()
    .optional()
    .describe('Number of replicas to scale to for Kafka pipes'),
  concurrency: z
    .number()
    .int()
    .min(0)
    .max(34)
    .nullable()
    .optional()
    .describe('Deprecated concurrency value for object storage pipes'),
  replicaCpuMillicores: z
    .number()
    .int()
    .min(125)
    .max(2000)
    .nullable()
    .optional()
    .describe('CPU in millicores for each streaming replica'),
  replicaMemoryGb: z
    .number()
    .min(0.5)
    .max(8)
    .nullable()
    .optional()
    .describe('Memory in GB for each streaming replica')
});

let cdcScalingSchema = z.object({
  replicaCpuMillicores: z
    .number()
    .int()
    .min(1000)
    .max(24000)
    .refine(value => value % 1000 === 0, {
      message: 'CPU must be a multiple of 1000 millicores'
    })
    .optional()
    .describe('CPU in millicores for database ClickPipes'),
  replicaMemoryGb: z
    .number()
    .min(4)
    .max(96)
    .refine(value => value % 4 === 0, {
      message: 'Memory must be a multiple of 4 GiB'
    })
    .optional()
    .describe('Memory in GiB for database ClickPipes')
});

export let listClickPipes = SlateTool.create(spec, {
  name: 'List ClickPipes',
  key: 'list_clickpipes',
  description: `List all ClickPipes (data ingestion pipelines) for a service. Shows pipeline names, states, scaling settings, and source configurations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to list ClickPipes for')
    })
  )
  .output(
    z.object({
      clickpipes: z.array(clickpipeSummarySchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let pipes = await client.listClickPipes(ctx.input.serviceId);
    let items = Array.isArray(pipes) ? pipes : [];

    return {
      output: {
        clickpipes: items.map((p: any) => ({
          clickpipeId: p.id,
          serviceId: p.serviceId,
          name: p.name,
          state: p.state,
          scaling: p.scaling,
          source: p.source
        }))
      },
      message: `Found **${items.length}** ClickPipes for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let getClickPipe = SlateTool.create(spec, {
  name: 'Get ClickPipe',
  key: 'get_clickpipe',
  description: `Retrieve detailed information about a specific ClickPipe, including its source configuration, destination, state, and scaling settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      clickpipeId: z.string().describe('ID of the ClickPipe')
    })
  )
  .output(
    z.object({
      clickpipeId: z.string(),
      name: z.string().optional(),
      state: z.string().optional(),
      scaling: z.record(z.string(), z.any()).optional(),
      source: z.record(z.string(), z.any()).optional(),
      destination: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let pipe = await client.getClickPipe(ctx.input.serviceId, ctx.input.clickpipeId);

    return {
      output: {
        clickpipeId: pipe.id,
        name: pipe.name,
        state: pipe.state,
        scaling: pipe.scaling,
        source: pipe.source,
        destination: pipe.destination
      },
      message: `ClickPipe **${pipe.name}** is **${pipe.state}**.`
    };
  })
  .build();

export let createClickPipe = SlateTool.create(spec, {
  name: 'Create ClickPipe',
  key: 'create_clickpipe',
  description: `Create a new ClickPipe data ingestion pipeline for a service. ClickPipes support sources like Apache Kafka, object storage, Amazon Kinesis, PostgreSQL, MySQL, BigQuery, and MongoDB. Provide the source configuration and destination table settings.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to create the ClickPipe for'),
      name: z.string().describe('Name for the new ClickPipe'),
      source: z
        .record(z.string(), z.any())
        .describe(
          'Source configuration (e.g., kafka, objectStorage, kinesis, postgres, mysql)'
        ),
      destination: z
        .record(z.string(), z.any())
        .describe('Destination configuration including database, table, and columns')
    })
  )
  .output(
    z.object({
      clickpipeId: z.string(),
      name: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createClickPipe(ctx.input.serviceId, {
      name: ctx.input.name,
      source: ctx.input.source,
      destination: ctx.input.destination
    });

    return {
      output: {
        clickpipeId: result.id,
        name: result.name,
        state: result.state
      },
      message: `ClickPipe **${result.name}** created successfully.`
    };
  })
  .build();

export let updateClickPipe = SlateTool.create(spec, {
  name: 'Update ClickPipe',
  key: 'update_clickpipe',
  description: `Update a ClickPipe's name, source, destination, field mappings, or settings. This uses the official ClickPipes PATCH endpoint.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      clickpipeId: z.string().describe('ID of the ClickPipe'),
      name: z.string().nullable().optional().describe('Updated ClickPipe name'),
      source: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Updated source configuration'),
      destination: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Updated destination configuration'),
      fieldMappings: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Updated field mappings'),
      settings: z
        .record(z.string(), z.any())
        .nullable()
        .optional()
        .describe('Updated ClickPipe settings')
    })
  )
  .output(
    z.object({
      clickpipeId: z.string(),
      name: z.string().optional(),
      state: z.string().optional(),
      clickpipe: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.source !== undefined) body.source = ctx.input.source;
    if (ctx.input.destination !== undefined) body.destination = ctx.input.destination;
    if (ctx.input.fieldMappings !== undefined) body.fieldMappings = ctx.input.fieldMappings;
    if (ctx.input.settings !== undefined) body.settings = ctx.input.settings;
    ensureBodyHasFields(body, 'ClickPipe');

    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.updateClickPipe(
      ctx.input.serviceId,
      ctx.input.clickpipeId,
      body
    );

    return {
      output: {
        clickpipeId: result.id || ctx.input.clickpipeId,
        name: result.name,
        state: result.state,
        clickpipe: result
      },
      message: `ClickPipe **${result.name || ctx.input.clickpipeId}** updated.`
    };
  })
  .build();

export let deleteClickPipe = SlateTool.create(spec, {
  name: 'Delete ClickPipe',
  key: 'delete_clickpipe',
  description: `Delete a ClickPipe data ingestion pipeline from a service.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      clickpipeId: z.string().describe('ID of the ClickPipe to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteClickPipe(ctx.input.serviceId, ctx.input.clickpipeId);

    return {
      output: { deleted: true },
      message: `ClickPipe **${ctx.input.clickpipeId}** deleted.`
    };
  })
  .build();

export let controlClickPipeState = SlateTool.create(spec, {
  name: 'Control ClickPipe State',
  key: 'control_clickpipe_state',
  description: `Change the state of a ClickPipe. Start, stop, or resync a data ingestion pipeline.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      clickpipeId: z.string().describe('ID of the ClickPipe'),
      command: z
        .enum(['start', 'stop', 'resync'])
        .describe('State transition command for the ClickPipe')
    })
  )
  .output(
    z.object({
      clickpipeId: z.string(),
      command: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.updateClickPipeState(
      ctx.input.serviceId,
      ctx.input.clickpipeId,
      ctx.input.command
    );

    return {
      output: {
        clickpipeId: result?.id || ctx.input.clickpipeId,
        command: ctx.input.command,
        state: result?.state
      },
      message: `ClickPipe **${ctx.input.clickpipeId}** command **${ctx.input.command}** submitted.`
    };
  })
  .build();

export let getClickPipeSettings = SlateTool.create(spec, {
  name: 'Get ClickPipe Settings',
  key: 'get_clickpipe_settings',
  description: `Retrieve tunable settings for a ClickPipe.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      clickpipeId: z.string().describe('ID of the ClickPipe')
    })
  )
  .output(
    z.object({
      settings: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let settings = await client.getClickPipeSettings(
      ctx.input.serviceId,
      ctx.input.clickpipeId
    );

    return {
      output: { settings },
      message: `Retrieved settings for ClickPipe **${ctx.input.clickpipeId}**.`
    };
  })
  .build();

export let updateClickPipeSettings = SlateTool.create(spec, {
  name: 'Update ClickPipe Settings',
  key: 'update_clickpipe_settings',
  description: `Replace tunable settings for a ClickPipe. The request body is passed to the official ClickPipe settings PUT endpoint.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      clickpipeId: z.string().describe('ID of the ClickPipe'),
      settings: z.record(z.string(), z.any()).describe('ClickPipe settings to apply')
    })
  )
  .output(
    z.object({
      settings: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    ensureBodyHasFields(ctx.input.settings, 'ClickPipe setting');

    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let settings = await client.updateClickPipeSettings(
      ctx.input.serviceId,
      ctx.input.clickpipeId,
      ctx.input.settings
    );

    return {
      output: { settings },
      message: `Updated settings for ClickPipe **${ctx.input.clickpipeId}**.`
    };
  })
  .build();

export let configureClickPipeScaling = SlateTool.create(spec, {
  name: 'Configure ClickPipe Scaling',
  key: 'configure_clickpipe_scaling',
  description: `Configure scaling for a Kafka, object storage, or streaming ClickPipe.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      clickpipeId: z.string().describe('ID of the ClickPipe'),
      scaling: scalingSchema.describe('Scaling fields to patch')
    })
  )
  .output(
    z.object({
      scaling: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    ensureBodyHasFields(ctx.input.scaling, 'ClickPipe scaling');

    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let scaling = await client.updateClickPipeScaling(
      ctx.input.serviceId,
      ctx.input.clickpipeId,
      ctx.input.scaling
    );

    return {
      output: { scaling },
      message: `Updated scaling for ClickPipe **${ctx.input.clickpipeId}**.`
    };
  })
  .build();

export let getCdcClickPipesScaling = SlateTool.create(spec, {
  name: 'Get CDC ClickPipes Scaling',
  key: 'get_cdc_clickpipes_scaling',
  description: `Retrieve shared scaling configuration for database CDC ClickPipes on a service.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      scaling: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let scaling = await client.getCdcClickPipesScaling(ctx.input.serviceId);

    return {
      output: { scaling },
      message: `Retrieved CDC ClickPipes scaling for service ${ctx.input.serviceId}.`
    };
  })
  .build();

export let configureCdcClickPipesScaling = SlateTool.create(spec, {
  name: 'Configure CDC ClickPipes Scaling',
  key: 'configure_cdc_clickpipes_scaling',
  description: `Configure shared CPU and memory scaling for database CDC ClickPipes on a service.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      scaling: cdcScalingSchema.describe('CDC scaling fields to patch')
    })
  )
  .output(
    z.object({
      scaling: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    ensureBodyHasFields(ctx.input.scaling, 'CDC ClickPipes scaling');

    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let scaling = await client.updateCdcClickPipesScaling(
      ctx.input.serviceId,
      ctx.input.scaling
    );

    return {
      output: { scaling },
      message: `Updated CDC ClickPipes scaling for service ${ctx.input.serviceId}.`
    };
  })
  .build();

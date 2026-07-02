import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let telegrafSchema = z.object({
  telegrafId: z.string().describe('Unique Telegraf configuration ID'),
  name: z.string().describe('Configuration name'),
  description: z.string().optional().describe('Configuration description'),
  orgId: z.string().optional().describe('Organization ID'),
  config: z.string().optional().describe('TOML configuration content'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listTelegrafs = SlateTool.create(spec, {
  name: 'List Telegraf Configs',
  key: 'list_telegrafs',
  description: `List all Telegraf agent configurations in the organization. Telegraf configurations define how the Telegraf agent collects, processes, and outputs data.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      telegrafs: z.array(telegrafSchema).describe('List of Telegraf configurations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTelegrafs();

    let telegrafs = (result.configurations || []).map((t: any) => ({
      telegrafId: t.id,
      name: t.name,
      description: t.description,
      orgId: t.orgID,
      config: t.config,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: { telegrafs },
      message: `Found **${telegrafs.length}** Telegraf configuration(s).`
    };
  })
  .build();

export let getTelegraf = SlateTool.create(spec, {
  name: 'Get Telegraf Config',
  key: 'get_telegraf',
  description: `Retrieve a specific Telegraf configuration by ID, including the full TOML configuration content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      telegrafId: z.string().describe('ID of the Telegraf configuration to retrieve')
    })
  )
  .output(telegrafSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let t = await client.getTelegraf(ctx.input.telegrafId);

    return {
      output: {
        telegrafId: t.id,
        name: t.name,
        description: t.description,
        orgId: t.orgID,
        config: t.config,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      },
      message: `Retrieved Telegraf configuration **${t.name}**.`
    };
  })
  .build();

export let createTelegraf = SlateTool.create(spec, {
  name: 'Create Telegraf Config',
  key: 'create_telegraf',
  description: `Create a new Telegraf agent configuration. The configuration should be in TOML format and define input, processor, and output plugins.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the Telegraf configuration'),
      description: z.string().optional().describe('Description of the configuration'),
      config: z.string().describe('Telegraf configuration content in TOML format')
    })
  )
  .output(telegrafSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let t = await client.createTelegraf({
      name: ctx.input.name,
      description: ctx.input.description,
      config: ctx.input.config
    });

    return {
      output: {
        telegrafId: t.id,
        name: t.name,
        description: t.description,
        orgId: t.orgID,
        config: t.config,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      },
      message: `Created Telegraf configuration **${t.name}** (ID: ${t.id}).`
    };
  })
  .build();

export let updateTelegraf = SlateTool.create(spec, {
  name: 'Update Telegraf Config',
  key: 'update_telegraf',
  description: `Update an existing Telegraf configuration's name, description, or TOML content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      telegrafId: z.string().describe('ID of the Telegraf configuration to update'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      config: z.string().optional().describe('New TOML configuration content')
    })
  )
  .output(telegrafSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let t = await client.updateTelegraf(ctx.input.telegrafId, {
      name: ctx.input.name,
      description: ctx.input.description,
      config: ctx.input.config
    });

    return {
      output: {
        telegrafId: t.id,
        name: t.name,
        description: t.description,
        orgId: t.orgID,
        config: t.config,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      },
      message: `Updated Telegraf configuration **${t.name}** (ID: ${t.id}).`
    };
  })
  .build();

export let deleteTelegraf = SlateTool.create(spec, {
  name: 'Delete Telegraf Config',
  key: 'delete_telegraf',
  description: `Permanently delete a Telegraf agent configuration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      telegrafId: z.string().describe('ID of the Telegraf configuration to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the configuration was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteTelegraf(ctx.input.telegrafId);

    return {
      output: { success: true },
      message: `Deleted Telegraf configuration ${ctx.input.telegrafId}.`
    };
  })
  .build();

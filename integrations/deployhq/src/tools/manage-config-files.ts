import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let configFileSchema = z.object({
  configFileIdentifier: z.string().describe('Config file identifier'),
  path: z.string().describe('File path relative to deployment root'),
  body: z.string().describe('File contents'),
  servers: z
    .array(
      z.object({
        serverIdentifier: z.string().describe('Server identifier'),
        name: z.string().describe('Server name')
      })
    )
    .optional()
    .describe('Servers this config file is deployed to')
});

export let listConfigFiles = SlateTool.create(spec, {
  name: 'List Config Files',
  key: 'list_config_files',
  description: `List all configuration files for a DeployHQ project. Config files are static files uploaded to servers during deployment but not stored in the repository (e.g., database.yml, .env files).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project')
    })
  )
  .output(
    z.object({
      configFiles: z.array(configFileSchema).describe('List of config files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let files = await client.listConfigFiles(ctx.input.projectPermalink);

    let mapped = (Array.isArray(files) ? files : []).map((f: any) => ({
      configFileIdentifier: f.identifier,
      path: f.path,
      body: f.body,
      servers: (f.servers || []).map((s: any) => ({
        serverIdentifier: s.identifier,
        name: s.name
      }))
    }));

    return {
      output: { configFiles: mapped },
      message: `Found **${mapped.length}** config file(s) in project \`${ctx.input.projectPermalink}\`.`
    };
  })
  .build();

export let createConfigFile = SlateTool.create(spec, {
  name: 'Create Config File',
  key: 'create_config_file',
  description: `Add a new configuration file to a DeployHQ project. Config files are deployed to servers but not tracked in version control. Useful for environment-specific settings like database credentials or API keys.`
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      path: z
        .string()
        .describe('File path relative to deployment root (e.g., config/database.yml)'),
      body: z.string().describe('File contents'),
      allServers: z.boolean().optional().describe('Upload to all servers (default: true)'),
      serverIdentifiers: z
        .array(z.string())
        .optional()
        .describe('Specific server or server group identifiers to deploy to')
    })
  )
  .output(configFileSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let data: Record<string, any> = {
      path: ctx.input.path,
      body: ctx.input.body
    };
    if (ctx.input.allServers !== undefined) data.all_servers = ctx.input.allServers;
    if (ctx.input.serverIdentifiers !== undefined)
      data.server_identifiers = ctx.input.serverIdentifiers;

    let f = await client.createConfigFile(ctx.input.projectPermalink, data);

    return {
      output: {
        configFileIdentifier: f.identifier,
        path: f.path,
        body: f.body,
        servers: (f.servers || []).map((s: any) => ({
          serverIdentifier: s.identifier,
          name: s.name
        }))
      },
      message: `Created config file \`${f.path}\` (\`${f.identifier}\`).`
    };
  })
  .build();

export let updateConfigFile = SlateTool.create(spec, {
  name: 'Update Config File',
  key: 'update_config_file',
  description: `Update an existing configuration file in a DeployHQ project. You can modify the path, contents, or which servers it deploys to.`
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      configFileIdentifier: z.string().describe('The config file identifier'),
      path: z.string().optional().describe('Updated file path'),
      body: z.string().optional().describe('Updated file contents'),
      allServers: z.boolean().optional().describe('Upload to all servers'),
      serverIdentifiers: z
        .array(z.string())
        .optional()
        .describe('Specific server or server group identifiers')
    })
  )
  .output(configFileSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let data: Record<string, any> = {};
    if (ctx.input.path !== undefined) data.path = ctx.input.path;
    if (ctx.input.body !== undefined) data.body = ctx.input.body;
    if (ctx.input.allServers !== undefined) data.all_servers = ctx.input.allServers;
    if (ctx.input.serverIdentifiers !== undefined)
      data.server_identifiers = ctx.input.serverIdentifiers;

    let f = await client.updateConfigFile(
      ctx.input.projectPermalink,
      ctx.input.configFileIdentifier,
      data
    );

    return {
      output: {
        configFileIdentifier: f.identifier,
        path: f.path,
        body: f.body,
        servers: (f.servers || []).map((s: any) => ({
          serverIdentifier: s.identifier,
          name: s.name
        }))
      },
      message: `Updated config file \`${f.path}\`.`
    };
  })
  .build();

export let deleteConfigFile = SlateTool.create(spec, {
  name: 'Delete Config File',
  key: 'delete_config_file',
  description: `Remove a configuration file from a DeployHQ project. The file will no longer be deployed to any servers.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      configFileIdentifier: z.string().describe('The config file identifier to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Deletion status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    await client.deleteConfigFile(ctx.input.projectPermalink, ctx.input.configFileIdentifier);

    return {
      output: { status: 'deleted' },
      message: `Deleted config file \`${ctx.input.configFileIdentifier}\`.`
    };
  })
  .build();

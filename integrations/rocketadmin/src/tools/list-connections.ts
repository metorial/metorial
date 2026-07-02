import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

let connectionSchema = z.object({
  connectionId: z.string().describe('Unique identifier of the connection'),
  title: z.string().optional().describe('Display title of the connection'),
  type: z.string().optional().describe('Database type (e.g., postgres, mysql, mongodb)'),
  host: z.string().optional().describe('Database host address'),
  port: z.number().optional().describe('Database port number'),
  database: z.string().optional().describe('Database name'),
  username: z.string().optional().describe('Database username'),
  ssl: z.boolean().optional().describe('Whether SSL is enabled'),
  isTestConnection: z.boolean().optional().describe('Whether this is a test connection')
});

export let listConnections = SlateTool.create(spec, {
  name: 'List Connections',
  key: 'list_connections',
  description: `Retrieve all database connections configured in your Rocketadmin account. Returns connection details including database type, host, port, and configuration status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      connections: z.array(connectionSchema).describe('List of database connections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.listConnections();

    let connections = data.map((c: Record<string, unknown>) => ({
      connectionId: String(c.id || ''),
      title: c.title as string | undefined,
      type: c.type as string | undefined,
      host: c.host as string | undefined,
      port: c.port as number | undefined,
      database: c.database as string | undefined,
      username: c.username as string | undefined,
      ssl: c.ssl as boolean | undefined,
      isTestConnection: c.isTestConnection as boolean | undefined
    }));

    return {
      output: { connections },
      message: `Found **${connections.length}** connection(s).`
    };
  })
  .build();

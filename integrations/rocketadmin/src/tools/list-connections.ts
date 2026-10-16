import { SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient, record, records, requiredString } from '../lib/client';
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
      connections: z.array(connectionSchema).describe('List of database connections'),
      raw: z.unknown().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createRocketadminClient(ctx.auth, ctx.config);

    let data = await client.listConnections();

    let entries = Array.isArray(data) ? data : record(data).connections;
    let connections = records(entries, 'connections').map(entry => {
      let c = entry.connection === undefined ? entry : record(entry.connection, 'connection');
      return {
        connectionId: requiredString(c.id, 'connection ID'),
        title: typeof c.title === 'string' ? c.title : undefined,
        type: typeof c.type === 'string' ? c.type : undefined,
        host: typeof c.host === 'string' ? c.host : undefined,
        port: typeof c.port === 'number' ? c.port : undefined,
        database: typeof c.database === 'string' ? c.database : undefined,
        username: typeof c.username === 'string' ? c.username : undefined,
        ssl: typeof c.ssl === 'boolean' ? c.ssl : undefined,
        isTestConnection:
          typeof c.isTestConnection === 'boolean' ? c.isTestConnection : undefined
      };
    });

    return {
      output: { connections, raw: data },
      message: `Found **${connections.length}** connection(s).`
    };
  })
  .build();

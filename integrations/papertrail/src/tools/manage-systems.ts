import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let systemSchema = z.object({
  systemId: z.number().describe('Unique system ID'),
  name: z.string().describe('Display name of the system'),
  hostname: z.string().nullable().describe('Syslog hostname filter'),
  ipAddress: z.string().nullable().describe('Source IP address'),
  lastEventAt: z.string().nullable().describe('ISO 8601 timestamp of the last received event'),
  autoDelete: z
    .boolean()
    .optional()
    .describe('Whether the system is set to auto-delete when inactive'),
  syslogHostname: z.string().optional().describe('Syslog destination hostname'),
  syslogPort: z.number().optional().describe('Syslog destination port')
});

export let listSystems = SlateTool.create(spec, {
  name: 'List Systems',
  key: 'list_systems',
  description: `List all systems (log senders) registered in Papertrail. Returns each system's name, hostname, IP address, last event timestamp, and syslog connection details. Useful for identifying active senders and those that have stopped logging.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      systems: z.array(systemSchema).describe('Array of registered systems')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listSystems();

    let systems = (Array.isArray(data) ? data : []).map((s: any) => ({
      systemId: s.id,
      name: s.name || '',
      hostname: s.hostname ?? null,
      ipAddress: s.ip_address ?? null,
      lastEventAt: s.last_event_at ?? null,
      autoDelete: s.auto_delete,
      syslogHostname: s.syslog?.hostname,
      syslogPort: s.syslog?.port
    }));

    return {
      output: { systems },
      message: `Found **${systems.length}** registered system(s).`
    };
  })
  .build();

export let createSystem = SlateTool.create(spec, {
  name: 'Create System',
  key: 'create_system',
  description: `Register a new system (log sender) in Papertrail. You can configure the system to log to a specific destination by port or destination ID. For standard syslog port (514), provide the system's static public IP address instead.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Display name for the new system'),
      hostname: z.string().optional().describe('Hostname to filter events by'),
      ipAddress: z
        .string()
        .optional()
        .describe('Static public IP address (for standard syslog port 514)'),
      destinationId: z
        .number()
        .optional()
        .describe('ID of the log destination to send logs to'),
      destinationPort: z.number().optional().describe('Port number of the log destination')
    })
  )
  .output(systemSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createSystem({
      name: ctx.input.name,
      hostname: ctx.input.hostname,
      ipAddress: ctx.input.ipAddress,
      destinationId: ctx.input.destinationId,
      destinationPort: ctx.input.destinationPort
    });

    return {
      output: {
        systemId: result.id,
        name: result.name || '',
        hostname: result.hostname ?? null,
        ipAddress: result.ip_address ?? null,
        lastEventAt: result.last_event_at ?? null,
        autoDelete: result.auto_delete,
        syslogHostname: result.syslog?.hostname,
        syslogPort: result.syslog?.port
      },
      message: `Created system **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let updateSystem = SlateTool.create(spec, {
  name: 'Update System',
  key: 'update_system',
  description: `Update an existing system's name, hostname, or IP address. Note that the log destination cannot be changed after creation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      systemId: z.number().describe('ID of the system to update'),
      name: z.string().optional().describe('New display name'),
      hostname: z.string().optional().describe('New hostname filter'),
      ipAddress: z.string().optional().describe('New source IP address')
    })
  )
  .output(systemSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateSystem(ctx.input.systemId, {
      name: ctx.input.name,
      hostname: ctx.input.hostname,
      ipAddress: ctx.input.ipAddress
    });

    return {
      output: {
        systemId: result.id,
        name: result.name || '',
        hostname: result.hostname ?? null,
        ipAddress: result.ip_address ?? null,
        lastEventAt: result.last_event_at ?? null,
        autoDelete: result.auto_delete,
        syslogHostname: result.syslog?.hostname,
        syslogPort: result.syslog?.port
      },
      message: `Updated system **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();

export let deleteSystem = SlateTool.create(spec, {
  name: 'Delete System',
  key: 'delete_system',
  description: `Remove a system (log sender) from Papertrail. This permanently unregisters the system; it will no longer appear in groups or searches.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      systemId: z.number().describe('ID of the system to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteSystem(ctx.input.systemId);

    return {
      output: { deleted: true },
      message: `Deleted system with ID **${ctx.input.systemId}**.`
    };
  })
  .build();

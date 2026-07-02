import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSystems = SlateTool.create(spec, {
  name: 'List Systems',
  key: 'list_systems',
  description: `List and search JumpCloud-managed devices (systems). Returns device details including OS, hostname, agent version, and connectivity status. Supports filtering by system attributes and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of systems to return (1-100, default 100)'),
      skip: z.number().min(0).optional().describe('Number of systems to skip for pagination'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression, e.g. "os:$eq:Mac OS X", "hostname:$regex:dev"'),
      fields: z.string().optional().describe('Comma-separated fields to return'),
      sort: z.string().optional().describe('Field to sort by. Prefix with "-" for descending')
    })
  )
  .output(
    z.object({
      systems: z
        .array(
          z.object({
            systemId: z.string().describe('System ID'),
            displayName: z.string().optional().describe('Display name'),
            hostname: z.string().optional().describe('Hostname'),
            os: z.string().optional().describe('Operating system'),
            osFamily: z
              .string()
              .optional()
              .describe('OS family (e.g. linux, darwin, windows)'),
            version: z.string().optional().describe('OS version'),
            arch: z.string().optional().describe('Architecture'),
            agentVersion: z.string().optional().describe('JumpCloud agent version'),
            active: z.boolean().optional().describe('Whether the system is active'),
            remoteIP: z.string().optional().describe('Last known remote IP'),
            serialNumber: z.string().optional().describe('Serial number'),
            lastContact: z.string().optional().describe('Last contact timestamp'),
            created: z.string().optional().describe('When the system was registered')
          })
        )
        .describe('List of systems'),
      totalCount: z.number().describe('Total number of systems matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let result = await client.listSystems({
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      filter: ctx.input.filter,
      fields: ctx.input.fields,
      sort: ctx.input.sort
    });

    let systems = result.results.map(s => ({
      systemId: s._id,
      displayName: s.displayName,
      hostname: s.hostname,
      os: s.os,
      osFamily: s.osFamily,
      version: s.version,
      arch: s.arch,
      agentVersion: s.agentVersion,
      active: s.active,
      remoteIP: s.remoteIP,
      serialNumber: s.serialNumber,
      lastContact: s.lastContact,
      created: s.created
    }));

    return {
      output: {
        systems,
        totalCount: result.totalCount
      },
      message: `Found **${result.totalCount}** systems. Returned **${systems.length}** systems.`
    };
  })
  .build();

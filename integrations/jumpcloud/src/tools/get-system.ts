import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSystem = SlateTool.create(spec, {
  name: 'Get System',
  key: 'get_system',
  description: `Retrieve detailed information about a specific JumpCloud-managed system (device) by its ID. Returns hardware info, OS details, agent status, and security configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      systemId: z.string().describe('JumpCloud system ID')
    })
  )
  .output(
    z.object({
      systemId: z.string().describe('System ID'),
      displayName: z.string().optional().describe('Display name'),
      hostname: z.string().optional().describe('Hostname'),
      os: z.string().optional().describe('Operating system'),
      osFamily: z.string().optional().describe('OS family'),
      version: z.string().optional().describe('OS version'),
      arch: z.string().optional().describe('Architecture'),
      agentVersion: z.string().optional().describe('JumpCloud agent version'),
      active: z.boolean().optional().describe('Whether active'),
      remoteIP: z.string().optional().describe('Last known remote IP'),
      serialNumber: z.string().optional().describe('Serial number'),
      lastContact: z.string().optional().describe('Last contact timestamp'),
      created: z.string().optional().describe('Registration date'),
      allowMultiFactorAuthentication: z.boolean().optional().describe('MFA allowed'),
      allowPublicKeyAuthentication: z.boolean().optional().describe('Public key auth allowed'),
      allowSshPasswordAuthentication: z
        .boolean()
        .optional()
        .describe('SSH password auth allowed'),
      allowSshRootLogin: z.boolean().optional().describe('SSH root login allowed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let system = await client.getSystem(ctx.input.systemId);

    return {
      output: {
        systemId: system._id,
        displayName: system.displayName,
        hostname: system.hostname,
        os: system.os,
        osFamily: system.osFamily,
        version: system.version,
        arch: system.arch,
        agentVersion: system.agentVersion,
        active: system.active,
        remoteIP: system.remoteIP,
        serialNumber: system.serialNumber,
        lastContact: system.lastContact,
        created: system.created,
        allowMultiFactorAuthentication: system.allowMultiFactorAuthentication,
        allowPublicKeyAuthentication: system.allowPublicKeyAuthentication,
        allowSshPasswordAuthentication: system.allowSshPasswordAuthentication,
        allowSshRootLogin: system.allowSshRootLogin
      },
      message: `Retrieved system **${system.displayName ?? system.hostname}** — ${system.os} ${system.version ?? ''}, agent v${system.agentVersion ?? 'unknown'}`
    };
  })
  .build();

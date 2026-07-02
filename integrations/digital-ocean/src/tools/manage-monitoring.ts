import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

export let listAlertPolicies = SlateTool.create(spec, {
  name: 'List Alert Policies',
  key: 'list_alert_policies',
  description: `List all monitoring alert policies. Shows CPU, memory, disk, and bandwidth alerts configured for Droplets and load balancers.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      policies: z.array(
        z.object({
          alertId: z.string().describe('Alert policy ID'),
          alertType: z.string().describe('Alert metric type'),
          description: z.string().describe('Alert description'),
          compare: z.string().describe('Comparison operator'),
          value: z.number().describe('Threshold value'),
          window: z.string().describe('Evaluation window'),
          enabled: z.boolean().describe('Whether the alert is enabled'),
          entities: z.array(z.string()).describe('Monitored entity IDs'),
          tags: z.array(z.string()).describe('Monitored tags')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let policies = await client.listAlertPolicies();

    return {
      output: {
        policies: policies.map((p: any) => ({
          alertId: p.uuid,
          alertType: p.type,
          description: p.description,
          compare: p.compare,
          value: p.value,
          window: p.window,
          enabled: p.enabled,
          entities: p.entities || [],
          tags: p.tags || []
        }))
      },
      message: `Found **${policies.length}** alert policy(ies).`
    };
  })
  .build();

export let manageUptimeChecks = SlateTool.create(spec, {
  name: 'Manage Uptime Checks',
  key: 'manage_uptime_checks',
  description: `List, create, update, or delete uptime checks. Uptime checks monitor the availability, latency, and SSL certificate status of URLs and IP addresses.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      checkId: z.string().optional().describe('Check ID (required for update/delete)'),
      name: z.string().optional().describe('Check name (required for create)'),
      target: z.string().optional().describe('URL or IP to monitor (required for create)'),
      checkType: z
        .string()
        .optional()
        .describe('Check type: https, http, ping (default: https)'),
      regions: z
        .array(z.string())
        .optional()
        .describe('Regions to check from (e.g., ["us_east", "eu_west"])'),
      enabled: z.boolean().optional().describe('Whether the check is enabled')
    })
  )
  .output(
    z.object({
      checks: z
        .array(
          z.object({
            checkId: z.string().describe('Check ID'),
            name: z.string().describe('Check name'),
            target: z.string().describe('Monitored URL or IP'),
            checkType: z.string().describe('Check type'),
            regions: z.array(z.string()).describe('Check regions'),
            enabled: z.boolean().describe('Whether enabled')
          })
        )
        .optional()
        .describe('List of uptime checks'),
      check: z
        .object({
          checkId: z.string().describe('Check ID'),
          name: z.string().describe('Check name'),
          target: z.string().describe('Monitored URL or IP'),
          checkType: z.string().describe('Check type'),
          regions: z.array(z.string()).describe('Check regions'),
          enabled: z.boolean().describe('Whether enabled')
        })
        .optional()
        .describe('Created/updated check'),
      deleted: z.boolean().optional().describe('Whether the check was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapCheck = (c: any) => ({
      checkId: c.id,
      name: c.name,
      target: c.target,
      checkType: c.type,
      regions: c.regions || [],
      enabled: c.enabled
    });

    if (ctx.input.action === 'list') {
      let checks = await client.listUptimeChecks();
      return {
        output: { checks: checks.map(mapCheck) },
        message: `Found **${checks.length}** uptime check(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.target) {
        throw digitalOceanValidationError('name and target are required for create action');
      }
      let check = await client.createUptimeCheck({
        name: ctx.input.name,
        target: ctx.input.target,
        type: ctx.input.checkType,
        regions: ctx.input.regions,
        enabled: ctx.input.enabled
      });
      return {
        output: { check: mapCheck(check) },
        message: `Created uptime check **${check.name}** monitoring **${check.target}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.checkId) {
        throw digitalOceanValidationError('checkId is required for update action');
      }
      let check = await client.updateUptimeCheck(ctx.input.checkId, {
        name: ctx.input.name,
        target: ctx.input.target,
        type: ctx.input.checkType,
        regions: ctx.input.regions,
        enabled: ctx.input.enabled
      });
      return {
        output: { check: mapCheck(check) },
        message: `Updated uptime check **${ctx.input.checkId}**.`
      };
    }

    // delete
    if (!ctx.input.checkId) {
      throw digitalOceanValidationError('checkId is required for delete action');
    }
    await client.deleteUptimeCheck(ctx.input.checkId);

    return {
      output: { deleted: true },
      message: `Deleted uptime check **${ctx.input.checkId}**.`
    };
  })
  .build();

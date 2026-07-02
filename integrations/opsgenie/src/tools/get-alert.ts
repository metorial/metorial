import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getAlert = SlateTool.create(spec, {
  name: 'Get Alert',
  key: 'get_alert',
  description: `Retrieve detailed information about a specific alert. Supports lookup by alert ID, tiny ID, or alias.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      alertIdentifier: z.string().describe('Alert ID, tiny ID, or alias'),
      identifierType: z
        .enum(['id', 'tiny', 'alias'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('Unique alert ID'),
      tinyId: z.string().optional().describe('Short numeric alert ID'),
      alias: z.string().optional().describe('Alert alias'),
      message: z.string().describe('Alert message'),
      status: z.string().describe('Alert status (open/closed)'),
      acknowledged: z.boolean().describe('Whether the alert has been acknowledged'),
      isSeen: z.boolean().describe('Whether the alert has been seen'),
      tags: z.array(z.string()).describe('Tags attached to the alert'),
      snoozed: z.boolean().describe('Whether the alert is snoozed'),
      count: z.number().describe('Number of times the alert occurred'),
      lastOccurredAt: z.string().describe('When the alert last occurred'),
      createdAt: z.string().describe('When the alert was created'),
      updatedAt: z.string().describe('When the alert was last updated'),
      source: z.string().optional().describe('Source of the alert'),
      owner: z.string().optional().describe('Owner of the alert'),
      priority: z.string().describe('Alert priority (P1-P5)'),
      entity: z.string().optional().describe('Entity the alert is related to'),
      description: z.string().optional().describe('Alert description'),
      details: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value properties'),
      actions: z.array(z.string()).optional().describe('Available custom actions'),
      responders: z
        .array(
          z.object({
            type: z.string().describe('Responder type'),
            id: z.string().optional().describe('Responder ID')
          })
        )
        .optional()
        .describe('Alert responders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let alert = await client.getAlert(
      ctx.input.alertIdentifier,
      ctx.input.identifierType ?? 'id'
    );

    return {
      output: {
        alertId: alert.id,
        tinyId: alert.tinyId,
        alias: alert.alias,
        message: alert.message,
        status: alert.status,
        acknowledged: alert.acknowledged ?? false,
        isSeen: alert.isSeen ?? false,
        tags: alert.tags ?? [],
        snoozed: alert.snoozed ?? false,
        count: alert.count ?? 1,
        lastOccurredAt: alert.lastOccurredAt,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt,
        source: alert.source,
        owner: alert.owner,
        priority: alert.priority,
        entity: alert.entity,
        description: alert.description,
        details: alert.details,
        actions: alert.actions,
        responders: alert.responders
      },
      message: `Alert **${alert.message}** — status: ${alert.status}, priority: ${alert.priority}, acknowledged: ${alert.acknowledged}`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let listContactPoints = SlateTool.create(spec, {
  name: 'List Contact Points',
  key: 'list_contact_points',
  description: `List all contact points configured for alert notifications. Contact points define where alert notifications are sent (e.g. Slack, email, PagerDuty, webhooks).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contactPoints: z.array(
        z.object({
          contactPointUid: z.string().describe('UID of the contact point'),
          name: z.string().describe('Contact point name'),
          type: z
            .string()
            .describe('Integration type (e.g. slack, email, pagerduty, webhook)'),
          disableResolveMessage: z
            .boolean()
            .optional()
            .describe('Whether resolve messages are disabled'),
          settings: z.any().optional().describe('Integration-specific settings')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.listContactPoints();

    let contactPoints = results.map((cp: any) => ({
      contactPointUid: cp.uid,
      name: cp.name,
      type: cp.type,
      disableResolveMessage: cp.disableResolveMessage,
      settings: cp.settings
    }));

    return {
      output: { contactPoints },
      message: `Found **${contactPoints.length}** contact point(s).`
    };
  })
  .build();

export let createContactPoint = SlateTool.create(spec, {
  name: 'Create Contact Point',
  key: 'create_contact_point',
  description: `Create a new contact point for alert notifications. Supports integrations like Slack, email, PagerDuty, webhook, Microsoft Teams, and more.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the contact point'),
      type: z
        .string()
        .describe(
          'Integration type (e.g. slack, email, pagerduty, webhook, teams, opsgenie, discord)'
        ),
      settings: z
        .record(z.string(), z.any())
        .describe(
          'Integration-specific settings (e.g. {"url": "..."} for webhook, {"addresses": "..."} for email)'
        ),
      disableResolveMessage: z
        .boolean()
        .optional()
        .describe('Disable sending resolve notifications')
    })
  )
  .output(
    z.object({
      contactPointUid: z.string().describe('UID of the created contact point'),
      name: z.string().describe('Name of the contact point'),
      type: z.string().describe('Integration type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      name: ctx.input.name,
      type: ctx.input.type,
      settings: ctx.input.settings
    };
    if (ctx.input.disableResolveMessage !== undefined) {
      body.disableResolveMessage = ctx.input.disableResolveMessage;
    }

    let result = await client.createContactPoint(body);

    return {
      output: {
        contactPointUid: result.uid,
        name: result.name || ctx.input.name,
        type: result.type || ctx.input.type
      },
      message: `Contact point **${result.name || ctx.input.name}** (${ctx.input.type}) created.`
    };
  })
  .build();

export let deleteContactPoint = SlateTool.create(spec, {
  name: 'Delete Contact Point',
  key: 'delete_contact_point',
  description: `Delete a contact point by its UID. Any notification policies referencing this contact point should be updated first.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactPointUid: z.string().describe('UID of the contact point to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteContactPoint(ctx.input.contactPointUid);

    return {
      output: {
        message: `Contact point ${ctx.input.contactPointUid} deleted.`
      },
      message: `Contact point **${ctx.input.contactPointUid}** has been deleted.`
    };
  })
  .build();

import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let functionNamespaceSchema = z.object({
  namespaceId: z.string().describe('Function namespace ID'),
  uuid: z.string().optional().describe('Namespace UUID'),
  label: z.string().optional().describe('Namespace label'),
  region: z.string().optional().describe('Namespace region'),
  apiHost: z.string().optional().describe('Namespace API hostname'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listFunctionNamespaces = SlateTool.create(spec, {
  name: 'List Function Namespaces',
  key: 'list_function_namespaces',
  description: `List DigitalOcean Functions namespaces. Namespaces group deployed serverless functions and provide the namespace host used to invoke them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      namespaces: z.array(functionNamespaceSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let namespaces = await client.listFunctionNamespaces();

    return {
      output: {
        namespaces: namespaces.map((namespace: any) => ({
          namespaceId: namespace.namespace,
          uuid: namespace.uuid,
          label: namespace.label,
          region: namespace.region,
          apiHost: namespace.api_host,
          createdAt: namespace.created_at,
          updatedAt: namespace.updated_at
        }))
      },
      message: `Found **${namespaces.length}** Function namespace(s).`
    };
  })
  .build();

let functionTriggerSchema = z.object({
  name: z.string().describe('Trigger name'),
  namespaceId: z.string().optional().describe('Function namespace ID'),
  functionName: z.string().optional().describe('Function name'),
  triggerType: z.string().optional().describe('Trigger type'),
  enabled: z.boolean().optional().describe('Whether the trigger is enabled'),
  cron: z.string().optional().describe('Scheduled trigger cron expression'),
  lastRunAt: z.string().optional().describe('Last run timestamp'),
  nextRunAt: z.string().optional().describe('Next run timestamp'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listFunctionTriggers = SlateTool.create(spec, {
  name: 'List Function Triggers',
  key: 'list_function_triggers',
  description: `List scheduled triggers in a DigitalOcean Functions namespace. Use this to audit scheduled invocations and their next run times.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      namespaceId: z.string().describe('Function namespace ID')
    })
  )
  .output(
    z.object({
      triggers: z.array(functionTriggerSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let triggers = await client.listFunctionTriggers(ctx.input.namespaceId);

    return {
      output: {
        triggers: triggers.map((trigger: any) => ({
          name: trigger.name,
          namespaceId: trigger.namespace,
          functionName: trigger.function,
          triggerType: trigger.type,
          enabled: trigger.is_enabled,
          cron: trigger.scheduled_details?.cron,
          lastRunAt: trigger.scheduled_runs?.last_run_at,
          nextRunAt: trigger.scheduled_runs?.next_run_at,
          createdAt: trigger.created_at,
          updatedAt: trigger.updated_at
        }))
      },
      message: `Found **${triggers.length}** Function trigger(s) in namespace **${ctx.input.namespaceId}**.`
    };
  })
  .build();

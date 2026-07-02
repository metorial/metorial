import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `List all marketing automation workflows in your account.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      automations: z.array(z.any()).describe('List of automations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listAutomations({
      page: ctx.input.page,
      limit: ctx.input.limit
    });
    let automations = Array.isArray(result) ? result : [];
    return {
      output: { automations },
      message: `Found **${automations.length}** automation(s).`
    };
  })
  .build();

export let getAutomation = SlateTool.create(spec, {
  name: 'Get Automation',
  key: 'get_automation',
  description: `Retrieve detailed information about an automation workflow including its design, trigger info, and activation status.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      automationId: z.number().describe('ID of the automation'),
      includeDesign: z.boolean().optional().describe('Include full flow design data')
    })
  )
  .output(
    z.object({
      automationId: z.number().describe('Automation ID'),
      details: z.any().describe('Automation details'),
      activation: z.any().optional().describe('Activation status'),
      design: z.any().optional().describe('Full flow design')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let _automation = await client.getAutomation(ctx.input.automationId);
    let details = await client.getAutomationDetails(ctx.input.automationId);
    let activation = await client.getAutomationActivation(ctx.input.automationId);
    let output: Record<string, any> = {
      automationId: ctx.input.automationId,
      details,
      activation
    };

    if (ctx.input.includeDesign) {
      output.design = await client.getAutomationDesign(ctx.input.automationId);
    }

    return {
      output: output as any,
      message: `Retrieved automation **${ctx.input.automationId}**.`
    };
  })
  .build();

export let toggleAutomation = SlateTool.create(spec, {
  name: 'Toggle Automation',
  key: 'toggle_automation',
  description: `Activate or deactivate an automation workflow.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      automationId: z.number().describe('ID of the automation'),
      isActive: z.boolean().describe('Set to true to activate, false to deactivate')
    })
  )
  .output(
    z.object({
      automationId: z.number().describe('Automation ID'),
      isActive: z.boolean().describe('New activation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.setAutomationActivation(ctx.input.automationId, {
      is_active: ctx.input.isActive
    });
    return {
      output: {
        automationId: ctx.input.automationId,
        isActive: ctx.input.isActive
      },
      message: `Automation **${ctx.input.automationId}** ${ctx.input.isActive ? 'activated' : 'deactivated'}.`
    };
  })
  .build();

export let deleteAutomation = SlateTool.create(spec, {
  name: 'Delete Automation',
  key: 'delete_automation',
  description: `Delete one or more automation workflows by ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      automationIds: z.array(z.number()).describe('IDs of automations to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let ids = ctx.input.automationIds.join(',');
    await client.deleteAutomations(ids);
    return {
      output: { success: true },
      message: `Deleted automation(s): **${ids}**.`
    };
  })
  .build();

export let getAutomationReport = SlateTool.create(spec, {
  name: 'Get Automation Report',
  key: 'get_automation_report',
  description: `Retrieve a comprehensive report for an automation workflow including overview statistics, email/SMS performance, and contacts who started or completed the automation.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      automationId: z.number().describe('ID of the automation'),
      includeEmailStats: z.boolean().optional().describe('Include email campaign statistics'),
      includeSmsStats: z.boolean().optional().describe('Include SMS campaign statistics'),
      includeContactsStarted: z
        .boolean()
        .optional()
        .describe('Include contacts who started the automation'),
      includeContactsEnded: z
        .boolean()
        .optional()
        .describe('Include contacts who completed the automation'),
      page: z.number().optional().describe('Page number for contacts lists'),
      limit: z.number().optional().describe('Limit for contacts lists')
    })
  )
  .output(
    z.object({
      overview: z.any().describe('Automation overview report'),
      emailStats: z.any().optional().describe('Email campaign statistics'),
      smsStats: z.any().optional().describe('SMS campaign statistics'),
      contactsStarted: z
        .array(z.any())
        .optional()
        .describe('Contacts who started the automation'),
      contactsEnded: z
        .array(z.any())
        .optional()
        .describe('Contacts who completed the automation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let { automationId, page, limit } = ctx.input;
    let overview = await client.getAutomationReport(automationId);
    let output: Record<string, any> = { overview };

    if (ctx.input.includeEmailStats) {
      output.emailStats = await client.getAutomationEmailStats(automationId);
    }
    if (ctx.input.includeSmsStats) {
      output.smsStats = await client.getAutomationSmsStats(automationId);
    }
    if (ctx.input.includeContactsStarted) {
      output.contactsStarted = await client.getAutomationContactsStarted(automationId, {
        page,
        limit
      });
    }
    if (ctx.input.includeContactsEnded) {
      output.contactsEnded = await client.getAutomationContactsEnded(automationId, {
        page,
        limit
      });
    }

    return {
      output: output as any,
      message: `Retrieved report for automation **${automationId}**.`
    };
  })
  .build();

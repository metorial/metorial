import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let listAlertRules = SlateTool.create(spec, {
  name: 'List Alert Rules',
  key: 'list_alert_rules',
  description: `List all Grafana-managed alert rules configured in the instance, including their conditions, evaluation intervals, and notification settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      alertRules: z.array(
        z.object({
          ruleUid: z.string().describe('UID of the alert rule'),
          title: z.string().describe('Alert rule title'),
          ruleGroup: z.string().optional().describe('Rule group this alert belongs to'),
          folderUid: z.string().optional().describe('UID of the folder containing this rule'),
          condition: z.string().optional().describe('Condition reference'),
          forDuration: z
            .string()
            .optional()
            .describe('Duration the condition must be true before firing'),
          noDataState: z.string().optional().describe('State when no data is returned'),
          execErrState: z.string().optional().describe('State when evaluation errors occur'),
          isPaused: z.boolean().optional().describe('Whether the rule is paused'),
          labels: z
            .record(z.string(), z.string())
            .optional()
            .describe('Labels attached to this rule'),
          annotations: z
            .record(z.string(), z.string())
            .optional()
            .describe('Annotations for the rule')
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

    let results = await client.listAlertRules();
    let rules = (Array.isArray(results) ? results : []).map((r: any) => ({
      ruleUid: r.uid,
      title: r.title,
      ruleGroup: r.ruleGroup,
      folderUid: r.folderUID,
      condition: r.condition,
      forDuration: r.for,
      noDataState: r.noDataState,
      execErrState: r.execErrState,
      isPaused: r.isPaused,
      labels: r.labels,
      annotations: r.annotations
    }));

    return {
      output: { alertRules: rules },
      message: `Found **${rules.length}** alert rule(s).`
    };
  })
  .build();

export let getAlertRule = SlateTool.create(spec, {
  name: 'Get Alert Rule',
  key: 'get_alert_rule',
  description: `Retrieve a specific alert rule by its UID, including full condition configuration, labels, and annotations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ruleUid: z.string().describe('UID of the alert rule to retrieve')
    })
  )
  .output(
    z.object({
      ruleUid: z.string().describe('UID of the alert rule'),
      title: z.string().describe('Alert rule title'),
      ruleGroup: z.string().optional().describe('Rule group'),
      folderUid: z.string().optional().describe('Folder UID'),
      condition: z.string().optional().describe('Condition reference'),
      forDuration: z.string().optional().describe('Pending duration'),
      noDataState: z.string().optional().describe('No-data state behavior'),
      execErrState: z.string().optional().describe('Error state behavior'),
      isPaused: z.boolean().optional().describe('Whether the rule is paused'),
      labels: z.record(z.string(), z.string()).optional().describe('Rule labels'),
      annotations: z.record(z.string(), z.string()).optional().describe('Rule annotations'),
      queries: z.array(z.any()).optional().describe('Alert query definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let r = await client.getAlertRule(ctx.input.ruleUid);

    return {
      output: {
        ruleUid: r.uid,
        title: r.title,
        ruleGroup: r.ruleGroup,
        folderUid: r.folderUID,
        condition: r.condition,
        forDuration: r.for,
        noDataState: r.noDataState,
        execErrState: r.execErrState,
        isPaused: r.isPaused,
        labels: r.labels,
        annotations: r.annotations,
        queries: r.data
      },
      message: `Retrieved alert rule **${r.title}**.`
    };
  })
  .build();

export let createAlertRule = SlateTool.create(spec, {
  name: 'Create Alert Rule',
  key: 'create_alert_rule',
  description: `Create a new Grafana-managed alert rule. Define conditions, evaluation queries, notification labels, and more.`,
  instructions: [
    'The alert rule must be placed in a folder (folderUid is required).',
    'At least one query in the "queries" array is required, with a condition referencing one of them.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the alert rule'),
      folderUid: z.string().describe('UID of the folder to place the rule in'),
      ruleGroup: z
        .string()
        .describe('Rule group name. Rules in the same group are evaluated together.'),
      condition: z
        .string()
        .describe(
          'Reference (refId) of the query or expression that defines the alert condition'
        ),
      queries: z
        .array(z.any())
        .describe('Array of alert query objects defining data source queries and expressions'),
      forDuration: z
        .string()
        .optional()
        .describe('Duration condition must be true before firing (e.g. "5m", "1h")'),
      noDataState: z
        .enum(['NoData', 'Alerting', 'OK'])
        .optional()
        .describe('Behavior when no data is returned'),
      execErrState: z
        .enum(['Error', 'Alerting', 'OK'])
        .optional()
        .describe('Behavior when an evaluation error occurs'),
      labels: z
        .record(z.string(), z.string())
        .optional()
        .describe('Labels to attach to the alert (used for routing notifications)'),
      annotations: z
        .record(z.string(), z.string())
        .optional()
        .describe('Annotations for the alert (summary, description, runbook_url, etc.)'),
      isPaused: z.boolean().optional().describe('Create the rule in a paused state')
    })
  )
  .output(
    z.object({
      ruleUid: z.string().describe('UID of the created alert rule'),
      title: z.string().describe('Title of the created rule')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      title: ctx.input.title,
      folderUID: ctx.input.folderUid,
      ruleGroup: ctx.input.ruleGroup,
      condition: ctx.input.condition,
      data: ctx.input.queries
    };
    if (ctx.input.forDuration) body.for = ctx.input.forDuration;
    if (ctx.input.noDataState) body.noDataState = ctx.input.noDataState;
    if (ctx.input.execErrState) body.execErrState = ctx.input.execErrState;
    if (ctx.input.labels) body.labels = ctx.input.labels;
    if (ctx.input.annotations) body.annotations = ctx.input.annotations;
    if (ctx.input.isPaused !== undefined) body.isPaused = ctx.input.isPaused;

    let result = await client.createAlertRule(body);

    return {
      output: {
        ruleUid: result.uid,
        title: result.title || ctx.input.title
      },
      message: `Alert rule **${result.title || ctx.input.title}** created successfully.`
    };
  })
  .build();

export let updateAlertRule = SlateTool.create(spec, {
  name: 'Update Alert Rule',
  key: 'update_alert_rule',
  description: `Update an existing Grafana-managed alert rule. Provide the full updated rule configuration.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ruleUid: z.string().describe('UID of the alert rule to update'),
      title: z.string().describe('Updated title'),
      folderUid: z.string().describe('Folder UID for the rule'),
      ruleGroup: z.string().describe('Rule group name'),
      condition: z.string().describe('Condition reference (refId)'),
      queries: z.array(z.any()).describe('Updated alert query definitions'),
      forDuration: z.string().optional().describe('Pending duration (e.g. "5m")'),
      noDataState: z
        .enum(['NoData', 'Alerting', 'OK'])
        .optional()
        .describe('No-data behavior'),
      execErrState: z.enum(['Error', 'Alerting', 'OK']).optional().describe('Error behavior'),
      labels: z.record(z.string(), z.string()).optional().describe('Updated labels'),
      annotations: z.record(z.string(), z.string()).optional().describe('Updated annotations'),
      isPaused: z.boolean().optional().describe('Whether to pause the rule')
    })
  )
  .output(
    z.object({
      ruleUid: z.string().describe('UID of the updated alert rule'),
      title: z.string().describe('Updated title')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      uid: ctx.input.ruleUid,
      title: ctx.input.title,
      folderUID: ctx.input.folderUid,
      ruleGroup: ctx.input.ruleGroup,
      condition: ctx.input.condition,
      data: ctx.input.queries
    };
    if (ctx.input.forDuration) body.for = ctx.input.forDuration;
    if (ctx.input.noDataState) body.noDataState = ctx.input.noDataState;
    if (ctx.input.execErrState) body.execErrState = ctx.input.execErrState;
    if (ctx.input.labels) body.labels = ctx.input.labels;
    if (ctx.input.annotations) body.annotations = ctx.input.annotations;
    if (ctx.input.isPaused !== undefined) body.isPaused = ctx.input.isPaused;

    let result = await client.updateAlertRule(ctx.input.ruleUid, body);

    return {
      output: {
        ruleUid: result.uid || ctx.input.ruleUid,
        title: result.title || ctx.input.title
      },
      message: `Alert rule **${result.title || ctx.input.title}** updated.`
    };
  })
  .build();

export let deleteAlertRule = SlateTool.create(spec, {
  name: 'Delete Alert Rule',
  key: 'delete_alert_rule',
  description: `Delete a Grafana-managed alert rule by its UID. This stops all evaluations and notifications for this rule.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ruleUid: z.string().describe('UID of the alert rule to delete')
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

    await client.deleteAlertRule(ctx.input.ruleUid);

    return {
      output: {
        message: `Alert rule ${ctx.input.ruleUid} deleted.`
      },
      message: `Alert rule **${ctx.input.ruleUid}** has been deleted.`
    };
  })
  .build();

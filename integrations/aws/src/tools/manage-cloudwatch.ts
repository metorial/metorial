import {
  DeleteAlarmsCommand,
  DescribeAlarmsCommand,
  GetMetricStatisticsCommand,
  ListMetricsCommand,
  PutMetricAlarmCommand,
  PutMetricDataCommand
} from '@aws-sdk/client-cloudwatch';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let dimensionSchema = z.object({
  name: z.string().describe('Dimension name'),
  value: z.string().describe('Dimension value')
});

let alarmSchema = z.object({
  alarmName: z.string().describe('Name of the alarm'),
  alarmArn: z.string().optional().describe('ARN of the alarm'),
  alarmDescription: z.string().optional().describe('Description of the alarm'),
  stateValue: z
    .string()
    .optional()
    .describe('Current state of the alarm (OK, ALARM, INSUFFICIENT_DATA)'),
  stateReason: z
    .string()
    .optional()
    .describe('Human-readable explanation for the alarm state'),
  stateUpdatedTimestamp: z
    .string()
    .optional()
    .describe('Timestamp when the alarm state was last updated'),
  metricName: z.string().optional().describe('Name of the metric associated with the alarm'),
  namespace: z.string().optional().describe('Namespace of the metric'),
  statistic: z
    .string()
    .optional()
    .describe('Statistic for the metric (SampleCount, Average, Sum, Minimum, Maximum)'),
  period: z
    .number()
    .optional()
    .describe('Period in seconds over which the statistic is applied'),
  evaluationPeriods: z
    .number()
    .optional()
    .describe('Number of periods over which data is compared to the threshold'),
  threshold: z.number().optional().describe('Value against which the statistic is compared'),
  comparisonOperator: z.string().optional().describe('Comparison operator used for the alarm'),
  actionsEnabled: z.boolean().optional().describe('Whether actions are enabled for the alarm'),
  alarmActions: z
    .array(z.string())
    .optional()
    .describe('List of action ARNs executed when the alarm transitions to ALARM state'),
  dimensions: z
    .array(dimensionSchema)
    .optional()
    .describe('Dimensions associated with the alarm metric')
});

let metricSchema = z.object({
  metricName: z.string().describe('Name of the metric'),
  namespace: z.string().describe('Namespace of the metric'),
  dimensions: z
    .array(dimensionSchema)
    .optional()
    .describe('Dimensions associated with the metric')
});

let datapointSchema = z.object({
  timestamp: z.string().describe('Timestamp of the datapoint'),
  sampleCount: z
    .number()
    .optional()
    .describe('Number of data points used for the statistical calculation'),
  average: z.number().optional().describe('Average of the data points'),
  sum: z.number().optional().describe('Sum of the data points'),
  minimum: z.number().optional().describe('Minimum value of the data points'),
  maximum: z.number().optional().describe('Maximum value of the data points'),
  unit: z.string().optional().describe('Unit of the metric')
});

let statisticValuesSchema = z.object({
  sampleCount: z.number().describe('Number of samples represented by this statistic set'),
  sum: z.number().describe('Sum of all sample values'),
  minimum: z.number().describe('Minimum sample value'),
  maximum: z.number().describe('Maximum sample value')
});

let metricDatumInputSchema = z.object({
  metricName: z.string().describe('Name of the custom metric to publish'),
  value: z.number().optional().describe('Single metric value to publish'),
  statisticValues: statisticValuesSchema
    .optional()
    .describe('Statistic set to publish instead of a single value'),
  unit: z.string().optional().describe('Metric unit, e.g. Count, Seconds, Percent, Bytes'),
  timestamp: z.string().optional().describe('Timestamp for the datapoint in ISO 8601 format'),
  dimensions: z
    .array(dimensionSchema)
    .optional()
    .describe('Dimensions associated with this metric datum')
});

let outputSchema = z.object({
  operation: z.string().describe('The operation that was performed'),
  alarms: z
    .array(alarmSchema)
    .optional()
    .describe('List of alarms (for list_alarms, describe_alarms)'),
  alarm: alarmSchema.optional().describe('Single alarm details (for create_update_alarm)'),
  metrics: z.array(metricSchema).optional().describe('List of metrics (for list_metrics)'),
  datapoints: z
    .array(datapointSchema)
    .optional()
    .describe('Metric statistics datapoints (for get_metric_statistics)'),
  label: z.string().optional().describe('Label for the metric (for get_metric_statistics)'),
  deletedAlarms: z
    .array(z.string())
    .optional()
    .describe('Names of deleted alarms (for delete_alarms)'),
  publishedMetricCount: z
    .number()
    .optional()
    .describe('Number of metric data points accepted by CloudWatch'),
  success: z.boolean().optional().describe('Whether the operation completed successfully'),
  nextToken: z.string().optional().describe('Token for retrieving the next page of results')
});

let mapDimensions = (dimensions?: Array<{ name: string; value: string }>) =>
  dimensions?.map(dimension => ({ Name: dimension.name, Value: dimension.value }));

let parseAlarm = (alarm: any): z.infer<typeof alarmSchema> | null => {
  if (!alarm.AlarmName) return null;

  let dimensions = (alarm.Dimensions ?? [])
    .map((dimension: any) =>
      dimension.Name && dimension.Value
        ? { name: dimension.Name, value: dimension.Value }
        : null
    )
    .filter(
      (dimension: any): dimension is { name: string; value: string } => dimension !== null
    );

  return {
    alarmName: alarm.AlarmName,
    alarmArn: alarm.AlarmArn,
    alarmDescription: alarm.AlarmDescription,
    stateValue: alarm.StateValue,
    stateReason: alarm.StateReason,
    stateUpdatedTimestamp: alarm.StateUpdatedTimestamp?.toISOString(),
    metricName: alarm.MetricName,
    namespace: alarm.Namespace,
    statistic: alarm.Statistic,
    period: alarm.Period,
    evaluationPeriods: alarm.EvaluationPeriods,
    threshold: alarm.Threshold,
    comparisonOperator: alarm.ComparisonOperator,
    actionsEnabled: alarm.ActionsEnabled,
    alarmActions: alarm.AlarmActions?.length ? alarm.AlarmActions : undefined,
    dimensions: dimensions.length > 0 ? dimensions : undefined
  };
};

export let manageCloudWatchTool = SlateTool.create(spec, {
  name: 'Manage CloudWatch',
  key: 'manage_cloudwatch',
  description: `Manage Amazon CloudWatch metrics and alarms. Supports listing and describing alarms, creating or updating metric alarms, deleting alarms, publishing custom metric data, retrieving metric statistics, and listing available metrics. Use this to monitor AWS resources, configure alerting thresholds, and query time-series metric data.`,
  instructions: [
    'Use operation "list_alarms" to list CloudWatch alarms. Optionally filter by "alarmNames" or "stateValue" (OK, ALARM, INSUFFICIENT_DATA). Supports pagination with "maxRecords" and "nextToken".',
    'Use operation "describe_alarms" to get full details for specific alarms by name. Provide "alarmNames" as an array.',
    'Use operation "create_update_alarm" to create a new metric alarm or update an existing one. Requires "alarmName", "namespace", "metricName", "comparisonOperator", "evaluationPeriods", "period", "statistic", and "threshold". Optionally provide "alarmDescription", "alarmActions", "actionsEnabled", and "dimensions".',
    'Use operation "delete_alarms" to delete one or more alarms. Provide "alarmNames" as an array of alarm names to delete.',
    'Use operation "put_metric_data" to publish one or more custom metric data points. Provide "namespace" and "metricData".',
    'Use operation "get_metric_statistics" to retrieve statistical data for a metric. Requires "namespace", "metricName", "startTime" (ISO 8601), "endTime" (ISO 8601), "period" (seconds), and "statistics" (e.g., ["Average", "Maximum"]). Optionally filter by "dimensions".',
    'Use operation "list_metrics" to discover available metrics. Optionally filter by "namespace", "metricName", or "dimensions". Supports pagination with "nextToken".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'list_alarms',
          'describe_alarms',
          'create_update_alarm',
          'delete_alarms',
          'put_metric_data',
          'get_metric_statistics',
          'list_metrics'
        ])
        .describe('The CloudWatch operation to perform'),
      alarmNames: z
        .array(z.string())
        .optional()
        .describe(
          'Alarm names to filter by (for list_alarms, describe_alarms, delete_alarms)'
        ),
      stateValue: z
        .enum(['OK', 'ALARM', 'INSUFFICIENT_DATA'])
        .optional()
        .describe('Filter alarms by state (for list_alarms)'),
      maxRecords: z
        .number()
        .optional()
        .describe('Maximum number of alarms to return, up to 100 (for list_alarms)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response'),
      alarmName: z
        .string()
        .optional()
        .describe('Name of the alarm (required for create_update_alarm)'),
      alarmDescription: z
        .string()
        .optional()
        .describe('Description of the alarm (for create_update_alarm)'),
      namespace: z
        .string()
        .optional()
        .describe(
          'Namespace of the metric (e.g., "AWS/EC2", "AWS/RDS"). Required for create_update_alarm, get_metric_statistics'
        ),
      metricName: z
        .string()
        .optional()
        .describe(
          'Name of the metric (e.g., "CPUUtilization"). Required for create_update_alarm, get_metric_statistics'
        ),
      comparisonOperator: z
        .enum([
          'GreaterThanOrEqualToThreshold',
          'GreaterThanThreshold',
          'LessThanThreshold',
          'LessThanOrEqualToThreshold',
          'LessThanLowerOrGreaterThanUpperThreshold',
          'LessThanLowerThreshold',
          'GreaterThanUpperThreshold'
        ])
        .optional()
        .describe(
          'Comparison operator for the alarm threshold (required for create_update_alarm)'
        ),
      evaluationPeriods: z
        .number()
        .optional()
        .describe(
          'Number of periods over which data is compared to threshold (required for create_update_alarm)'
        ),
      period: z
        .number()
        .optional()
        .describe(
          'Period in seconds for the metric statistic (required for create_update_alarm, get_metric_statistics)'
        ),
      statistic: z
        .enum(['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum'])
        .optional()
        .describe('Statistic to apply to the metric (required for create_update_alarm)'),
      threshold: z
        .number()
        .optional()
        .describe(
          'Value to compare the metric statistic against (required for create_update_alarm)'
        ),
      actionsEnabled: z
        .boolean()
        .optional()
        .describe(
          'Whether alarm actions are enabled (for create_update_alarm, defaults to true)'
        ),
      alarmActions: z
        .array(z.string())
        .optional()
        .describe(
          'List of ARNs to notify when alarm transitions to ALARM state (for create_update_alarm)'
        ),
      dimensions: z
        .array(dimensionSchema)
        .optional()
        .describe(
          'Dimensions to filter metrics by (for create_update_alarm, get_metric_statistics, list_metrics)'
        ),
      startTime: z
        .string()
        .optional()
        .describe(
          'Start of the time range in ISO 8601 format, e.g. "2024-01-01T00:00:00Z" (required for get_metric_statistics)'
        ),
      endTime: z
        .string()
        .optional()
        .describe(
          'End of the time range in ISO 8601 format, e.g. "2024-01-02T00:00:00Z" (required for get_metric_statistics)'
        ),
      statistics: z
        .array(z.enum(['SampleCount', 'Average', 'Sum', 'Minimum', 'Maximum']))
        .optional()
        .describe('List of statistics to retrieve (required for get_metric_statistics)'),
      metricData: z
        .array(metricDatumInputSchema)
        .optional()
        .describe('Custom metric data points to publish (required for put_metric_data)')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let { operation } = ctx.input;

    if (operation === 'list_alarms') {
      let response = await client.send('CloudWatch DescribeAlarms', () =>
        client.cloudWatch.send(
          new DescribeAlarmsCommand({
            AlarmNames: ctx.input.alarmNames,
            StateValue: ctx.input.stateValue as any,
            MaxRecords: ctx.input.maxRecords,
            NextToken: ctx.input.nextToken
          })
        )
      );
      let alarms = (response.MetricAlarms ?? [])
        .map(parseAlarm)
        .filter((alarm): alarm is z.infer<typeof alarmSchema> => alarm !== null);

      return {
        output: {
          operation: 'list_alarms',
          alarms,
          nextToken: response.NextToken
        },
        message: `Found **${alarms.length}** alarm(s)${response.NextToken ? ' (more available)' : ''}.`
      };
    }

    if (operation === 'describe_alarms') {
      if (!ctx.input.alarmNames || ctx.input.alarmNames.length === 0) {
        throw awsServiceError('alarmNames is required for describe_alarms');
      }

      let response = await client.send('CloudWatch DescribeAlarms', () =>
        client.cloudWatch.send(
          new DescribeAlarmsCommand({
            AlarmNames: ctx.input.alarmNames
          })
        )
      );
      let alarms = (response.MetricAlarms ?? [])
        .map(parseAlarm)
        .filter((alarm): alarm is z.infer<typeof alarmSchema> => alarm !== null);

      return {
        output: {
          operation: 'describe_alarms',
          alarms
        },
        message: `Retrieved details for **${alarms.length}** alarm(s).`
      };
    }

    if (operation === 'create_update_alarm') {
      if (!ctx.input.alarmName)
        throw awsServiceError('alarmName is required for create_update_alarm');
      if (!ctx.input.namespace)
        throw awsServiceError('namespace is required for create_update_alarm');
      if (!ctx.input.metricName)
        throw awsServiceError('metricName is required for create_update_alarm');
      if (!ctx.input.comparisonOperator)
        throw awsServiceError('comparisonOperator is required for create_update_alarm');
      if (ctx.input.evaluationPeriods === undefined)
        throw awsServiceError('evaluationPeriods is required for create_update_alarm');
      if (ctx.input.period === undefined)
        throw awsServiceError('period is required for create_update_alarm');
      if (!ctx.input.statistic)
        throw awsServiceError('statistic is required for create_update_alarm');
      if (ctx.input.threshold === undefined)
        throw awsServiceError('threshold is required for create_update_alarm');

      await client.send('CloudWatch PutMetricAlarm', () =>
        client.cloudWatch.send(
          new PutMetricAlarmCommand({
            AlarmName: ctx.input.alarmName,
            Namespace: ctx.input.namespace,
            MetricName: ctx.input.metricName,
            ComparisonOperator: ctx.input.comparisonOperator as any,
            EvaluationPeriods: ctx.input.evaluationPeriods,
            Period: ctx.input.period,
            Statistic: ctx.input.statistic as any,
            Threshold: ctx.input.threshold,
            AlarmDescription: ctx.input.alarmDescription,
            ActionsEnabled: ctx.input.actionsEnabled,
            AlarmActions: ctx.input.alarmActions,
            Dimensions: mapDimensions(ctx.input.dimensions)
          })
        )
      );

      return {
        output: {
          operation: 'create_update_alarm',
          alarm: {
            alarmName: ctx.input.alarmName,
            alarmDescription: ctx.input.alarmDescription,
            namespace: ctx.input.namespace,
            metricName: ctx.input.metricName,
            comparisonOperator: ctx.input.comparisonOperator,
            evaluationPeriods: ctx.input.evaluationPeriods,
            period: ctx.input.period,
            statistic: ctx.input.statistic,
            threshold: ctx.input.threshold,
            actionsEnabled: ctx.input.actionsEnabled ?? true,
            alarmActions: ctx.input.alarmActions,
            dimensions: ctx.input.dimensions
          }
        },
        message: `Successfully created/updated alarm **${ctx.input.alarmName}** for metric **${ctx.input.namespace}/${ctx.input.metricName}**.`
      };
    }

    if (operation === 'delete_alarms') {
      if (!ctx.input.alarmNames || ctx.input.alarmNames.length === 0) {
        throw awsServiceError('alarmNames is required for delete_alarms');
      }

      await client.send('CloudWatch DeleteAlarms', () =>
        client.cloudWatch.send(new DeleteAlarmsCommand({ AlarmNames: ctx.input.alarmNames }))
      );

      return {
        output: {
          operation: 'delete_alarms',
          deletedAlarms: ctx.input.alarmNames
        },
        message: `Deleted **${ctx.input.alarmNames.length}** alarm(s): ${ctx.input.alarmNames.map(n => `**${n}**`).join(', ')}.`
      };
    }

    if (operation === 'put_metric_data') {
      if (!ctx.input.namespace)
        throw awsServiceError('namespace is required for put_metric_data');
      if (!ctx.input.metricData || ctx.input.metricData.length === 0) {
        throw awsServiceError('metricData is required for put_metric_data');
      }

      let metricData = ctx.input.metricData.map((datum, index) => {
        if (datum.value === undefined && !datum.statisticValues) {
          throw awsServiceError(
            `metricData[${index}].value or metricData[${index}].statisticValues is required for put_metric_data`
          );
        }

        return {
          MetricName: datum.metricName,
          Value: datum.value,
          Unit: datum.unit as any,
          Timestamp: datum.timestamp ? new Date(datum.timestamp) : undefined,
          StatisticValues: datum.statisticValues
            ? {
                SampleCount: datum.statisticValues.sampleCount,
                Sum: datum.statisticValues.sum,
                Minimum: datum.statisticValues.minimum,
                Maximum: datum.statisticValues.maximum
              }
            : undefined,
          Dimensions: mapDimensions(datum.dimensions)
        };
      });

      await client.send('CloudWatch PutMetricData', () =>
        client.cloudWatch.send(
          new PutMetricDataCommand({
            Namespace: ctx.input.namespace,
            MetricData: metricData
          })
        )
      );

      return {
        output: {
          operation: 'put_metric_data',
          publishedMetricCount: ctx.input.metricData.length,
          success: true
        },
        message: `Published **${ctx.input.metricData.length}** metric data point(s) to namespace **${ctx.input.namespace}**.`
      };
    }

    if (operation === 'get_metric_statistics') {
      if (!ctx.input.namespace)
        throw awsServiceError('namespace is required for get_metric_statistics');
      if (!ctx.input.metricName)
        throw awsServiceError('metricName is required for get_metric_statistics');
      if (!ctx.input.startTime)
        throw awsServiceError('startTime is required for get_metric_statistics');
      if (!ctx.input.endTime)
        throw awsServiceError('endTime is required for get_metric_statistics');
      if (ctx.input.period === undefined)
        throw awsServiceError('period is required for get_metric_statistics');
      if (!ctx.input.statistics || ctx.input.statistics.length === 0) {
        throw awsServiceError('statistics is required for get_metric_statistics');
      }

      let startTime = ctx.input.startTime;
      let endTime = ctx.input.endTime;

      let response = await client.send('CloudWatch GetMetricStatistics', () =>
        client.cloudWatch.send(
          new GetMetricStatisticsCommand({
            Namespace: ctx.input.namespace,
            MetricName: ctx.input.metricName,
            StartTime: new Date(startTime),
            EndTime: new Date(endTime),
            Period: ctx.input.period,
            Statistics: ctx.input.statistics as any,
            Dimensions: mapDimensions(ctx.input.dimensions)
          })
        )
      );
      let datapoints = (response.Datapoints ?? [])
        .filter(datapoint => datapoint.Timestamp)
        .map(datapoint => ({
          timestamp: datapoint.Timestamp!.toISOString(),
          sampleCount: datapoint.SampleCount,
          average: datapoint.Average,
          sum: datapoint.Sum,
          minimum: datapoint.Minimum,
          maximum: datapoint.Maximum,
          unit: datapoint.Unit
        }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      return {
        output: {
          operation: 'get_metric_statistics',
          label: response.Label,
          datapoints
        },
        message: `Retrieved **${datapoints.length}** datapoint(s) for metric **${ctx.input.namespace}/${ctx.input.metricName}**.`
      };
    }

    if (operation === 'list_metrics') {
      let response = await client.send('CloudWatch ListMetrics', () =>
        client.cloudWatch.send(
          new ListMetricsCommand({
            Namespace: ctx.input.namespace,
            MetricName: ctx.input.metricName,
            NextToken: ctx.input.nextToken,
            Dimensions: mapDimensions(ctx.input.dimensions)
          })
        )
      );
      let metrics: z.infer<typeof metricSchema>[] = [];
      for (let metric of response.Metrics ?? []) {
        if (!metric.MetricName || !metric.Namespace) continue;

        let dimensions = (metric.Dimensions ?? [])
          .map(dimension =>
            dimension.Name && dimension.Value
              ? { name: dimension.Name, value: dimension.Value }
              : null
          )
          .filter(
            (dimension): dimension is { name: string; value: string } => dimension !== null
          );

        let outputMetric: z.infer<typeof metricSchema> = {
          metricName: metric.MetricName,
          namespace: metric.Namespace
        };
        if (dimensions.length > 0) outputMetric.dimensions = dimensions;
        metrics.push(outputMetric);
      }

      let filterLabel = ctx.input.namespace ? ` in namespace **${ctx.input.namespace}**` : '';

      return {
        output: {
          operation: 'list_metrics',
          metrics,
          nextToken: response.NextToken
        },
        message: `Found **${metrics.length}** metric(s)${filterLabel}${response.NextToken ? ' (more available)' : ''}.`
      };
    }

    throw awsServiceError(`Unknown operation: ${operation}`);
  })
  .build();

import { DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let alarmInputSchema = z.object({
  alarmName: z.string().describe('Name of the alarm'),
  alarmArn: z.string().describe('ARN of the alarm'),
  stateValue: z.string().describe('Current state: OK, ALARM, or INSUFFICIENT_DATA'),
  previousStateValue: z.string().optional().describe('Previous alarm state'),
  stateReason: z.string().optional().describe('Reason for the state change'),
  stateUpdatedTimestamp: z.string().describe('When the state last changed'),
  metricName: z.string().optional().describe('Metric name'),
  namespace: z.string().optional().describe('Metric namespace'),
  threshold: z.number().optional().describe('Alarm threshold'),
  comparisonOperator: z.string().optional().describe('Comparison operator')
});

let alarmOutputSchema = z.object({
  alarmName: z.string().describe('Name of the alarm'),
  alarmArn: z.string().describe('ARN of the alarm'),
  stateValue: z.string().describe('Current state: OK, ALARM, or INSUFFICIENT_DATA'),
  previousStateValue: z.string().optional().describe('Previous alarm state'),
  stateReason: z.string().optional().describe('Reason for the state change'),
  stateUpdatedTimestamp: z.string().describe('When the state last changed'),
  metricName: z.string().optional().describe('Metric name'),
  namespace: z.string().optional().describe('Metric namespace'),
  threshold: z.number().optional().describe('Alarm threshold'),
  comparisonOperator: z.string().optional().describe('Comparison operator')
});

export let cloudwatchAlarmChangesTrigger = SlateTrigger.create(spec, {
  name: 'CloudWatch Alarm Changes',
  key: 'cloudwatch_alarm_changes',
  description:
    'Polls for CloudWatch alarm state changes. Detects when alarms transition between OK, ALARM, and INSUFFICIENT_DATA states.'
})
  .input(alarmInputSchema)
  .output(alarmOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = clientFromContext(ctx);
      let previousAlarmStates: Record<string, string> =
        (ctx.state as Record<string, string>) ?? {};

      let response = await client.send('CloudWatch DescribeAlarms', () =>
        client.cloudWatch.send(new DescribeAlarmsCommand({ MaxRecords: 100 }))
      );

      let currentAlarms = (response.MetricAlarms ?? []).flatMap(alarm => {
        if (
          !alarm.AlarmName ||
          !alarm.AlarmArn ||
          !alarm.StateValue ||
          !alarm.StateUpdatedTimestamp
        ) {
          return [];
        }

        return [
          {
            alarmName: alarm.AlarmName,
            alarmArn: alarm.AlarmArn,
            stateValue: alarm.StateValue,
            stateReason: alarm.StateReason,
            stateUpdatedTimestamp: alarm.StateUpdatedTimestamp.toISOString(),
            metricName: alarm.MetricName,
            namespace: alarm.Namespace,
            threshold: alarm.Threshold,
            comparisonOperator: alarm.ComparisonOperator
          }
        ];
      });

      let inputs: z.infer<typeof alarmInputSchema>[] = [];
      let newStates: Record<string, string> = {};

      for (let alarm of currentAlarms) {
        newStates[alarm.alarmName] = alarm.stateValue;
        let previousState = previousAlarmStates[alarm.alarmName];

        if (previousState !== undefined && previousState !== alarm.stateValue) {
          inputs.push({
            alarmName: alarm.alarmName,
            alarmArn: alarm.alarmArn,
            stateValue: alarm.stateValue,
            previousStateValue: previousState,
            stateReason: alarm.stateReason,
            stateUpdatedTimestamp: alarm.stateUpdatedTimestamp,
            metricName: alarm.metricName,
            namespace: alarm.namespace,
            threshold: alarm.threshold,
            comparisonOperator: alarm.comparisonOperator
          });
        }
      }

      return {
        inputs,
        updatedState: newStates
      };
    },

    handleEvent: async ctx => {
      let alarm = ctx.input;
      let eventType =
        alarm.stateValue === 'ALARM'
          ? 'alarm.triggered'
          : alarm.stateValue === 'OK'
            ? 'alarm.resolved'
            : 'alarm.insufficient_data';

      return {
        type: eventType,
        id: `${alarm.alarmName}-${alarm.stateUpdatedTimestamp}`,
        output: {
          alarmName: alarm.alarmName,
          alarmArn: alarm.alarmArn,
          stateValue: alarm.stateValue,
          previousStateValue: alarm.previousStateValue,
          stateReason: alarm.stateReason,
          stateUpdatedTimestamp: alarm.stateUpdatedTimestamp,
          metricName: alarm.metricName,
          namespace: alarm.namespace,
          threshold: alarm.threshold,
          comparisonOperator: alarm.comparisonOperator
        }
      };
    }
  })
  .build();

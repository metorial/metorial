import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'opsgenie',
  name: 'OpsGenie',
  description:
    'Incident management and alerting platform by Atlassian that routes alerts to on-call responders using schedules, escalation policies, and routing rules. Manage alerts, incidents, on-call schedules, escalation policies, teams, and users.',
  metadata: {},
  config,
  auth
});

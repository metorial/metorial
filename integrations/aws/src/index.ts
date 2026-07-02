import { Slate } from 'slates';
import { spec } from './spec';
import {
  manageCloudWatchTool,
  manageDynamoDbTool,
  manageEc2InstancesTool,
  manageIamTool,
  manageLambdaTool,
  manageS3Tool,
  manageSnsTool,
  manageSqsTool,
  manageStsTool
} from './tools';
import {
  cloudwatchAlarmChangesTrigger,
  ec2InstanceStateChangesTrigger,
  inboundWebhook
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageEc2InstancesTool,
    manageS3Tool,
    manageLambdaTool,
    manageDynamoDbTool,
    manageIamTool,
    manageCloudWatchTool,
    manageSnsTool,
    manageSqsTool,
    manageStsTool
  ],
  triggers: [inboundWebhook, cloudwatchAlarmChangesTrigger, ec2InstanceStateChangesTrigger]
});

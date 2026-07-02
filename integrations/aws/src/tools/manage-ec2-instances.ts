import {
  DescribeInstancesCommand,
  RebootInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  TerminateInstancesCommand
} from '@aws-sdk/client-ec2';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let tagSchema = z.object({
  key: z.string().describe('Tag key'),
  value: z.string().describe('Tag value')
});

let instanceSchema = z.object({
  instanceId: z.string().describe('EC2 instance ID (e.g., i-0abcd1234efgh5678)'),
  instanceType: z.string().optional().describe('Instance type (e.g., t3.micro, m5.large)'),
  state: z
    .string()
    .optional()
    .describe(
      'Current instance state (pending, running, shutting-down, terminated, stopping, stopped)'
    ),
  stateCode: z
    .number()
    .optional()
    .describe(
      'Numeric state code (0=pending, 16=running, 32=shutting-down, 48=terminated, 64=stopping, 80=stopped)'
    ),
  publicIpAddress: z.string().optional().describe('Public IPv4 address, if assigned'),
  privateIpAddress: z.string().optional().describe('Private IPv4 address'),
  publicDnsName: z.string().optional().describe('Public DNS hostname'),
  privateDnsName: z.string().optional().describe('Private DNS hostname'),
  vpcId: z.string().optional().describe('VPC ID the instance is running in'),
  subnetId: z.string().optional().describe('Subnet ID the instance is running in'),
  availabilityZone: z.string().optional().describe('Availability zone (e.g., us-east-1a)'),
  imageId: z.string().optional().describe('AMI ID used to launch the instance'),
  keyName: z.string().optional().describe('Name of the key pair used at launch'),
  launchTime: z.string().optional().describe('Timestamp when the instance was launched'),
  platform: z.string().optional().describe('Platform (windows or empty for Linux)'),
  architecture: z.string().optional().describe('Instance architecture (x86_64, arm64)'),
  securityGroups: z
    .array(
      z.object({
        groupId: z.string().describe('Security group ID'),
        groupName: z.string().describe('Security group name')
      })
    )
    .optional()
    .describe('Security groups attached to the instance'),
  tags: z.array(tagSchema).optional().describe('Tags assigned to the instance'),
  iamInstanceProfile: z.string().optional().describe('ARN of the IAM instance profile'),
  ebsOptimized: z.boolean().optional().describe('Whether the instance is EBS-optimized')
});

let actionResultSchema = z.object({
  instanceId: z.string().describe('EC2 instance ID'),
  previousState: z.string().optional().describe('State before the action'),
  currentState: z.string().optional().describe('State after the action')
});

let parseInstance = (instance: any): z.infer<typeof instanceSchema> => ({
  instanceId: instance.InstanceId ?? '',
  instanceType: instance.InstanceType,
  state: instance.State?.Name,
  stateCode: instance.State?.Code,
  publicIpAddress: instance.PublicIpAddress,
  privateIpAddress: instance.PrivateIpAddress,
  publicDnsName: instance.PublicDnsName || undefined,
  privateDnsName: instance.PrivateDnsName || undefined,
  vpcId: instance.VpcId,
  subnetId: instance.SubnetId,
  availabilityZone: instance.Placement?.AvailabilityZone,
  imageId: instance.ImageId,
  keyName: instance.KeyName || undefined,
  launchTime: instance.LaunchTime?.toISOString(),
  platform: instance.Platform,
  architecture: instance.Architecture,
  securityGroups:
    instance.SecurityGroups && instance.SecurityGroups.length > 0
      ? instance.SecurityGroups.map((group: any) => ({
          groupId: group.GroupId ?? '',
          groupName: group.GroupName ?? ''
        }))
      : undefined,
  tags:
    instance.Tags && instance.Tags.length > 0
      ? instance.Tags.map((tag: any) => ({
          key: tag.Key ?? '',
          value: tag.Value ?? ''
        }))
      : undefined,
  iamInstanceProfile: instance.IamInstanceProfile?.Arn,
  ebsOptimized: instance.EbsOptimized
});

let parseStateChange = (change: any): z.infer<typeof actionResultSchema> => ({
  instanceId: change.InstanceId ?? '',
  previousState: change.PreviousState?.Name,
  currentState: change.CurrentState?.Name
});

export let manageEc2InstancesTool = SlateTool.create(spec, {
  name: 'Manage EC2 Instances',
  key: 'manage_ec2_instances',
  description: `List, start, stop, terminate, or reboot Amazon EC2 instances. Use the list operation to discover instances with filtering by IDs, states, or tags. Use action operations to control instance lifecycle.`,
  instructions: [
    'To **list** instances, set operation to "list". Optionally filter by instanceIds, states, or tagFilters.',
    'To **start** stopped instances, set operation to "start" and provide instanceIds.',
    'To **stop** running instances, set operation to "stop" and provide instanceIds. Use force to force stop if needed.',
    'To **terminate** instances permanently, set operation to "terminate" and provide instanceIds. This is irreversible.',
    'To **reboot** instances, set operation to "reboot" and provide instanceIds.',
    'The list operation supports pagination via nextToken and maxResults.',
    'Tag filters use the format { key: "Name", value: "my-server" } and match instances where the tag key has the given value.'
  ],
  constraints: [
    'Terminate is irreversible — all data on instance store volumes is lost.',
    'You can only start instances that are in the "stopped" state.',
    'You can only stop instances that are in the "running" state.',
    'You can list up to 1000 instances per request.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'start', 'stop', 'terminate', 'reboot'])
        .describe('The EC2 instance operation to perform'),
      instanceIds: z
        .array(z.string())
        .optional()
        .describe(
          'Instance IDs to target (required for start, stop, terminate, reboot; optional filter for list)'
        ),
      states: z
        .array(
          z.enum(['pending', 'running', 'shutting-down', 'terminated', 'stopping', 'stopped'])
        )
        .optional()
        .describe('Filter instances by state (only for list operation)'),
      tagFilters: z
        .array(
          z.object({
            key: z.string().describe('Tag key to filter on'),
            value: z.string().describe('Tag value to match')
          })
        )
        .optional()
        .describe('Filter instances by tags (only for list operation)'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return for list operation (5-1000)'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous list request'),
      force: z
        .boolean()
        .optional()
        .describe(
          'Force stop the instance without waiting for graceful shutdown (only for stop operation)'
        ),
      hibernate: z
        .boolean()
        .optional()
        .describe(
          'Hibernate the instance instead of stopping it (only for stop operation, instance must support hibernation)'
        ),
      additionalFilters: z
        .array(
          z.object({
            name: z
              .string()
              .describe('Filter name (e.g., "vpc-id", "instance-type", "availability-zone")'),
            values: z.array(z.string()).describe('Filter values to match')
          })
        )
        .optional()
        .describe(
          'Additional EC2 API filters for the list operation (e.g., vpc-id, instance-type, availability-zone)'
        )
    })
  )
  .output(
    z.object({
      instances: z
        .array(instanceSchema)
        .optional()
        .describe('List of instances returned by the list operation'),
      actionResults: z
        .array(actionResultSchema)
        .optional()
        .describe('State change results for start, stop, terminate, or reboot operations'),
      nextToken: z
        .string()
        .optional()
        .describe('Pagination token for retrieving the next page of list results'),
      totalCount: z.number().optional().describe('Number of instances or results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let {
      operation,
      instanceIds,
      states,
      tagFilters,
      maxResults,
      nextToken,
      force,
      hibernate,
      additionalFilters
    } = ctx.input;

    if (operation === 'list') {
      let filters = [
        ...(states && states.length > 0
          ? [{ Name: 'instance-state-name', Values: states }]
          : []),
        ...(tagFilters ?? []).map(tag => ({
          Name: `tag:${tag.key}`,
          Values: [tag.value]
        })),
        ...(additionalFilters ?? []).map(filter => ({
          Name: filter.name,
          Values: filter.values
        }))
      ];

      let response = await client.send('EC2 DescribeInstances', () =>
        client.ec2.send(
          new DescribeInstancesCommand({
            InstanceIds: instanceIds && instanceIds.length > 0 ? instanceIds : undefined,
            Filters: filters.length > 0 ? filters : undefined,
            MaxResults: maxResults,
            NextToken: nextToken
          })
        )
      );

      let instances = (response.Reservations ?? []).flatMap(reservation =>
        (reservation.Instances ?? []).map(parseInstance)
      );

      let countMsg =
        instances.length === 0
          ? 'No instances found'
          : `Found **${instances.length}** instance(s)`;
      let filterMsg = '';
      if (states && states.length > 0) {
        filterMsg += ` in state(s): ${states.join(', ')}`;
      }
      if (tagFilters && tagFilters.length > 0) {
        filterMsg += ` matching ${tagFilters.length} tag filter(s)`;
      }
      let paginationMsg = response.NextToken ? ' (more results available)' : '';

      return {
        output: {
          instances,
          nextToken: response.NextToken,
          totalCount: instances.length
        },
        message: `${countMsg}${filterMsg}${paginationMsg}`
      };
    }

    if (!instanceIds || instanceIds.length === 0) {
      throw awsServiceError(`instanceIds are required for the "${operation}" operation`);
    }

    if (operation === 'start') {
      let response = await client.send('EC2 StartInstances', () =>
        client.ec2.send(new StartInstancesCommand({ InstanceIds: instanceIds }))
      );
      let actionResults = (response.StartingInstances ?? [])
        .map(parseStateChange)
        .filter(result => result.instanceId);

      return {
        output: {
          actionResults,
          totalCount: actionResults.length
        },
        message: `Started **${actionResults.length}** instance(s): ${instanceIds.join(', ')}`
      };
    }

    if (operation === 'stop') {
      let response = await client.send('EC2 StopInstances', () =>
        client.ec2.send(
          new StopInstancesCommand({
            InstanceIds: instanceIds,
            Force: force,
            Hibernate: hibernate
          })
        )
      );
      let actionResults = (response.StoppingInstances ?? [])
        .map(parseStateChange)
        .filter(result => result.instanceId);

      let extraMsg = force ? ' (forced)' : '';
      extraMsg += hibernate ? ' (hibernate)' : '';

      return {
        output: {
          actionResults,
          totalCount: actionResults.length
        },
        message: `Stopped **${actionResults.length}** instance(s)${extraMsg}: ${instanceIds.join(', ')}`
      };
    }

    if (operation === 'terminate') {
      let response = await client.send('EC2 TerminateInstances', () =>
        client.ec2.send(new TerminateInstancesCommand({ InstanceIds: instanceIds }))
      );
      let actionResults = (response.TerminatingInstances ?? [])
        .map(parseStateChange)
        .filter(result => result.instanceId);

      return {
        output: {
          actionResults,
          totalCount: actionResults.length
        },
        message: `Terminated **${actionResults.length}** instance(s): ${instanceIds.join(', ')}`
      };
    }

    if (operation === 'reboot') {
      await client.send('EC2 RebootInstances', () =>
        client.ec2.send(new RebootInstancesCommand({ InstanceIds: instanceIds }))
      );

      let actionResults = instanceIds.map(id => ({
        instanceId: id,
        previousState: 'running',
        currentState: 'running'
      }));

      return {
        output: {
          actionResults,
          totalCount: actionResults.length
        },
        message: `Rebooted **${actionResults.length}** instance(s): ${instanceIds.join(', ')}`
      };
    }

    throw awsServiceError(`Unknown operation: ${operation}`);
  })
  .build();

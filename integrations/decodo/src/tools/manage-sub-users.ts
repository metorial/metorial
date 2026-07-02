import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicApiClient } from '../lib/public-api-client';
import { spec } from '../spec';

let subUserSchema = z.object({
  subUserId: z.number().describe('Sub-user ID'),
  username: z.string().describe('Sub-user username'),
  status: z.string().describe('Sub-user status (active, disabled)'),
  createdAt: z.string().describe('Creation timestamp'),
  traffic: z.number().describe('Traffic used in GB'),
  trafficLimit: z.number().describe('Traffic limit in GB'),
  serviceType: z.string().describe('Service type (e.g. residential_proxies)'),
  autoDisable: z
    .boolean()
    .describe('Whether the sub-user is auto-disabled when traffic limit is reached')
});

export let listSubUsers = SlateTool.create(spec, {
  name: 'List Sub-Users',
  key: 'list_sub_users',
  description: `List all active proxy sub-users on the account. Returns usernames, traffic usage, traffic limits, and status for each sub-user.`,
  constraints: ['Requires API Key authentication (Public API).'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subUsers: z.array(subUserSchema).describe('List of sub-users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    let subUsers = await client.listSubUsers();

    return {
      output: { subUsers },
      message: `Found **${subUsers.length}** sub-user(s).`
    };
  })
  .build();

export let createSubUser = SlateTool.create(spec, {
  name: 'Create Sub-User',
  key: 'create_sub_user',
  description: `Create a new proxy sub-user with specified credentials and optional traffic limits. Sub-users can be used to separate and control proxy access across different applications or team members.`,
  constraints: ['Requires API Key authentication (Public API).', 'Username must be unique.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Username for the new sub-user'),
      password: z.string().describe('Password for the new sub-user'),
      trafficLimit: z.number().optional().describe('Traffic limit in GB'),
      serviceType: z.string().optional().describe('Service type (e.g. "residential_proxies")'),
      autoDisable: z
        .boolean()
        .optional()
        .describe('Auto-disable sub-user when traffic limit is reached')
    })
  )
  .output(subUserSchema)
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    let subUser = await client.createSubUser({
      username: ctx.input.username,
      password: ctx.input.password,
      trafficLimit: ctx.input.trafficLimit,
      serviceType: ctx.input.serviceType,
      autoDisable: ctx.input.autoDisable
    });

    return {
      output: subUser,
      message: `Sub-user **${subUser.username}** created successfully with ID \`${subUser.subUserId}\`.`
    };
  })
  .build();

export let updateSubUser = SlateTool.create(spec, {
  name: 'Update Sub-User',
  key: 'update_sub_user',
  description: `Update an existing proxy sub-user's password, traffic limit, or auto-disable setting.`,
  constraints: ['Requires API Key authentication (Public API).'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subUserId: z.number().describe('ID of the sub-user to update'),
      password: z.string().optional().describe('New password'),
      trafficLimit: z.number().optional().describe('New traffic limit in GB'),
      autoDisable: z
        .boolean()
        .optional()
        .describe('Auto-disable sub-user when traffic limit is reached')
    })
  )
  .output(subUserSchema)
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    let subUser = await client.updateSubUser(ctx.input.subUserId, {
      password: ctx.input.password,
      trafficLimit: ctx.input.trafficLimit,
      autoDisable: ctx.input.autoDisable
    });

    return {
      output: subUser,
      message: `Sub-user **${subUser.username}** (ID: \`${subUser.subUserId}\`) updated successfully.`
    };
  })
  .build();

export let deleteSubUser = SlateTool.create(spec, {
  name: 'Delete Sub-User',
  key: 'delete_sub_user',
  description: `Permanently delete a proxy sub-user by their ID. This action cannot be undone.`,
  constraints: [
    'Requires API Key authentication (Public API).',
    'This action is irreversible.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      subUserId: z.number().describe('ID of the sub-user to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful'),
      subUserId: z.number().describe('ID of the deleted sub-user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    await client.deleteSubUser(ctx.input.subUserId);

    return {
      output: {
        deleted: true,
        subUserId: ctx.input.subUserId
      },
      message: `Sub-user with ID \`${ctx.input.subUserId}\` deleted successfully.`
    };
  })
  .build();

export let getSubUserTraffic = SlateTool.create(spec, {
  name: 'Get Sub-User Traffic',
  key: 'get_sub_user_traffic',
  description: `Get traffic usage statistics for a specific proxy sub-user. Supports predefined time periods (24h, 7 days, month) or custom date ranges.`,
  constraints: [
    'Requires API Key authentication (Public API).',
    'For custom date ranges, both "from" and "to" must be provided.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subUserId: z.number().describe('ID of the sub-user'),
      period: z
        .enum(['24h', '7days', 'month', 'custom'])
        .describe('Time period for traffic data'),
      from: z
        .string()
        .optional()
        .describe('Start date in yyyy-mm-dd format (required if period is "custom")'),
      to: z
        .string()
        .optional()
        .describe('End date in yyyy-mm-dd format (required if period is "custom")'),
      serviceType: z
        .string()
        .optional()
        .describe('Service type filter (e.g. "residential_proxies")')
    })
  )
  .output(
    z.object({
      traffic: z.number().describe('Total traffic used in GB'),
      trafficRx: z.number().describe('Traffic received in GB'),
      trafficTx: z.number().describe('Traffic sent in GB')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    let traffic = await client.getSubUserTraffic(ctx.input.subUserId, {
      type: ctx.input.period,
      from: ctx.input.from,
      to: ctx.input.to,
      serviceType: ctx.input.serviceType
    });

    return {
      output: traffic,
      message: `Sub-user \`${ctx.input.subUserId}\` has used **${traffic.traffic} GB** total (${traffic.trafficRx} GB received, ${traffic.trafficTx} GB sent) in the **${ctx.input.period}** period.`
    };
  })
  .build();

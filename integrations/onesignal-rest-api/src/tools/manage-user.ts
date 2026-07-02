import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userPropertiesSchema = z
  .object({
    tags: z.record(z.string(), z.any()).optional().describe('Custom key-value tags'),
    language: z.string().optional().describe('Language code, e.g. "en"'),
    timezoneId: z.string().optional().describe('Timezone identifier, e.g. "America/New_York"'),
    lat: z.number().optional().describe('Latitude'),
    long: z.number().optional().describe('Longitude'),
    country: z.string().optional().describe('Two-letter country code')
  })
  .optional();

let subscriptionInputSchema = z.object({
  type: z
    .enum([
      'Email',
      'SMS',
      'iOSPush',
      'AndroidPush',
      'HuaweiPush',
      'FireOSPush',
      'WindowsPush',
      'macOSPush',
      'ChromeExtensionPush',
      'ChromePush',
      'SafariLegacyPush',
      'FirefoxPush',
      'SafariPush'
    ])
    .describe('Subscription platform type'),
  token: z.string().describe('Push token, email address, or phone number'),
  enabled: z.boolean().optional().describe('Whether the subscription is active')
});

let subscriptionOutputSchema = z.object({
  subscriptionId: z.string().optional(),
  type: z.string().optional(),
  token: z.string().optional(),
  enabled: z.boolean().optional()
});

let userOutputSchema = z.object({
  onesignalId: z.string().optional().describe('OneSignal internal user ID'),
  externalId: z.string().optional().describe('External user ID'),
  properties: z
    .object({
      tags: z.record(z.string(), z.any()).optional(),
      language: z.string().optional(),
      timezoneId: z.string().optional(),
      country: z.string().optional(),
      firstActive: z.number().optional(),
      lastActive: z.number().optional()
    })
    .optional(),
  subscriptions: z.array(subscriptionOutputSchema).optional()
});

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in OneSignal with optional identity, properties (tags, language, country), and subscriptions (push, email, SMS). If a user with the given external ID already exists, it will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      externalId: z.string().optional().describe('External user identifier'),
      properties: userPropertiesSchema.describe(
        'User properties like tags, language, country'
      ),
      subscriptions: z
        .array(subscriptionInputSchema)
        .optional()
        .describe('Initial subscriptions to create')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let body: Record<string, any> = {};

    if (ctx.input.externalId) {
      body.identity = { external_id: ctx.input.externalId };
    }

    if (ctx.input.properties) {
      let props: Record<string, any> = {};
      if (ctx.input.properties.tags) props.tags = ctx.input.properties.tags;
      if (ctx.input.properties.language) props.language = ctx.input.properties.language;
      if (ctx.input.properties.timezoneId) props.timezone_id = ctx.input.properties.timezoneId;
      if (ctx.input.properties.lat !== undefined) props.lat = ctx.input.properties.lat;
      if (ctx.input.properties.long !== undefined) props.long = ctx.input.properties.long;
      if (ctx.input.properties.country) props.country = ctx.input.properties.country;
      body.properties = props;
    }

    if (ctx.input.subscriptions) {
      body.subscriptions = ctx.input.subscriptions;
    }

    let result = await client.createUser(body);

    return {
      output: mapUser(result),
      message: `User created${result.identity?.onesignal_id ? ` with OneSignal ID **${result.identity.onesignal_id}**` : ''}.`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a user's profile, properties, identity, and all subscriptions by alias (external_id or onesignal_id).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      aliasLabel: z
        .string()
        .default('external_id')
        .describe('Alias type to look up by, e.g. "external_id" or "onesignal_id"'),
      aliasId: z.string().describe('Alias value to look up')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.getUser(ctx.input.aliasLabel, ctx.input.aliasId);

    return {
      output: mapUser(result),
      message: `Retrieved user **${ctx.input.aliasId}**${result.subscriptions?.length ? ` with ${result.subscriptions.length} subscription(s)` : ''}.`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a user's properties such as tags, language, timezone, location, and country. Identify the user by alias label and alias ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      aliasLabel: z
        .string()
        .default('external_id')
        .describe('Alias type, e.g. "external_id" or "onesignal_id"'),
      aliasId: z.string().describe('Alias value'),
      properties: z
        .object({
          tags: z
            .record(z.string(), z.any())
            .optional()
            .describe(
              'Custom key-value tags. Set a tag value to "" (empty string) to delete it.'
            ),
          language: z.string().optional().describe('Language code'),
          timezoneId: z.string().optional().describe('Timezone identifier'),
          lat: z.number().optional().describe('Latitude'),
          long: z.number().optional().describe('Longitude'),
          country: z.string().optional().describe('Two-letter country code')
        })
        .describe('Properties to update')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let props: Record<string, any> = {};
    if (ctx.input.properties.tags) props.tags = ctx.input.properties.tags;
    if (ctx.input.properties.language) props.language = ctx.input.properties.language;
    if (ctx.input.properties.timezoneId) props.timezone_id = ctx.input.properties.timezoneId;
    if (ctx.input.properties.lat !== undefined) props.lat = ctx.input.properties.lat;
    if (ctx.input.properties.long !== undefined) props.long = ctx.input.properties.long;
    if (ctx.input.properties.country) props.country = ctx.input.properties.country;

    let result = await client.updateUser(ctx.input.aliasLabel, ctx.input.aliasId, props);

    return {
      output: mapUser(result),
      message: `User **${ctx.input.aliasId}** updated successfully.`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Permanently delete a user and all associated data by alias.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      aliasLabel: z
        .string()
        .default('external_id')
        .describe('Alias type, e.g. "external_id" or "onesignal_id"'),
      aliasId: z.string().describe('Alias value of the user to delete')
    })
  )
  .output(
    z.object({
      onesignalId: z.string().optional().describe('OneSignal ID of the deleted user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.config.appId
    });

    let result = await client.deleteUser(ctx.input.aliasLabel, ctx.input.aliasId);

    return {
      output: {
        onesignalId: result.identity?.onesignal_id
      },
      message: `User **${ctx.input.aliasId}** deleted successfully.`
    };
  })
  .build();

let mapUser = (data: any) => ({
  onesignalId: data.identity?.onesignal_id,
  externalId: data.identity?.external_id,
  properties: data.properties
    ? {
        tags: data.properties.tags,
        language: data.properties.language,
        timezoneId: data.properties.timezone_id,
        country: data.properties.country,
        firstActive: data.properties.first_active,
        lastActive: data.properties.last_active
      }
    : undefined,
  subscriptions: data.subscriptions?.map((s: any) => ({
    subscriptionId: s.id,
    type: s.type,
    token: s.token,
    enabled: s.enabled
  }))
});

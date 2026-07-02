import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsAdminClient } from '../lib/client';
import { googleAnalyticsServiceError } from '../lib/errors';
import {
  propertyIdInstructions,
  propertyIdSchema,
  resolvePropertyId
} from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

let webStreamDataOutputSchema = z
  .object({
    measurementId: z
      .string()
      .optional()
      .describe(
        'GA4 Measurement ID for this web data stream, e.g. "G-XXXXXXXXXX". Pass this to send_events or validate_events as measurementId.'
      ),
    firebaseAppId: z.string().optional(),
    defaultUri: z.string().optional()
  })
  .passthrough();

let dataStreamOutputSchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
  displayName: z.string().optional(),
  webStreamData: webStreamDataOutputSchema.optional(),
  androidAppStreamData: z.any().optional(),
  iosAppStreamData: z.any().optional(),
  createTime: z.string().optional(),
  updateTime: z.string().optional()
});

export let manageDataStreams = SlateTool.create(spec, {
  name: 'Manage Data Streams',
  key: 'manage_data_streams',
  description: `List, get, create, update, or delete data streams on a GA4 property. Data streams represent sources of data flowing into GA4, such as websites (Web) or mobile apps (iOS/Android).

Also supports listing and creating Measurement Protocol secrets for a specific data stream. Use "list" or "get" to discover webStreamData.measurementId for send_events and validate_events, then use "list_secrets" or "create_secret" to select an apiSecret for that same stream.`,
  instructions: [
    ...propertyIdInstructions,
    'If measurementId is not supplied or configured, use action "list" or "get" on this tool to discover webStreamData.measurementId for a web stream before calling send_events or validate_events.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(googleAnalyticsActionScopes.manageDataStreams)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_secrets',
          'create_secret',
          'delete_secret'
        ])
        .describe(
          'Action to perform. "list_secrets", "create_secret", and "delete_secret" manage Measurement Protocol secrets for a stream.'
        ),
      dataStreamId: z
        .string()
        .optional()
        .describe(
          'ID of the data stream (required for get, update, delete, list_secrets, create_secret, and delete_secret).'
        ),
      streamType: z
        .enum(['WEB_DATA_STREAM', 'ANDROID_APP_DATA_STREAM', 'IOS_APP_DATA_STREAM'])
        .optional()
        .describe('Type of data stream (required for create).'),
      webStreamData: z
        .object({
          defaultUri: z
            .string()
            .optional()
            .describe('Default URI for the web stream (e.g., "https://example.com").')
        })
        .optional()
        .describe('Web stream configuration (for create/update of web streams).'),
      androidAppStreamData: z
        .object({
          packageName: z.string().optional().describe('Android app package name.')
        })
        .optional()
        .describe('Android app stream configuration.'),
      iosAppStreamData: z
        .object({
          bundleId: z.string().optional().describe('iOS app bundle ID.')
        })
        .optional()
        .describe('iOS app stream configuration.'),
      displayName: z
        .string()
        .optional()
        .describe('Display name for the data stream (for create/update).'),
      secretDisplayName: z
        .string()
        .optional()
        .describe('Display name for a Measurement Protocol secret (for create_secret).'),
      secretId: z
        .string()
        .optional()
        .describe('ID of the Measurement Protocol secret (required for delete_secret).'),
      pageSize: z.number().optional(),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      dataStreams: z.array(dataStreamOutputSchema).optional(),
      dataStream: dataStreamOutputSchema.optional(),
      secrets: z
        .array(
          z.object({
            name: z.string().optional(),
            displayName: z.string().optional(),
            secretValue: z
              .string()
              .optional()
              .describe('Measurement Protocol API secret to pass as apiSecret.')
          })
        )
        .optional(),
      secret: z
        .object({
          name: z.string().optional(),
          displayName: z.string().optional(),
          secretValue: z
            .string()
            .optional()
            .describe('Measurement Protocol API secret to pass as apiSecret.')
        })
        .optional(),
      deleted: z.boolean().optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsAdminClient({
      token: ctx.auth.token
    });

    const propertyId = resolvePropertyId(ctx.input, ctx.config);
    let action = ctx.input.action;

    if (action === 'list') {
      let result = await client.listDataStreams(propertyId, {
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let streams = result.dataStreams || [];
      return {
        output: {
          dataStreams: streams,
          nextPageToken: result.nextPageToken
        },
        message: `Found **${streams.length}** data stream(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.dataStreamId)
        throw googleAnalyticsServiceError('dataStreamId is required for get action.');
      let result = await client.getDataStream(propertyId, ctx.input.dataStreamId);
      return {
        output: { dataStream: result },
        message: `Retrieved data stream **${result.displayName}** (${result.type}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.streamType || !ctx.input.displayName) {
        throw googleAnalyticsServiceError(
          'streamType and displayName are required for create action.'
        );
      }
      let body: any = {
        type: ctx.input.streamType,
        displayName: ctx.input.displayName
      };
      if (ctx.input.webStreamData) body.webStreamData = ctx.input.webStreamData;
      if (ctx.input.androidAppStreamData)
        body.androidAppStreamData = ctx.input.androidAppStreamData;
      if (ctx.input.iosAppStreamData) body.iosAppStreamData = ctx.input.iosAppStreamData;

      let result = await client.createDataStream(propertyId, body);
      return {
        output: { dataStream: result },
        message: `Created data stream **${result.displayName}** (${result.type}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.dataStreamId)
        throw googleAnalyticsServiceError('dataStreamId is required for update action.');
      let updateFields: string[] = [];
      let body: any = {};
      if (ctx.input.displayName !== undefined) {
        updateFields.push('displayName');
        body.displayName = ctx.input.displayName;
      }
      if (updateFields.length === 0) {
        throw googleAnalyticsServiceError(
          'At least one field (displayName) must be provided for update.'
        );
      }
      let result = await client.updateDataStream(
        propertyId,
        ctx.input.dataStreamId,
        updateFields.join(','),
        body
      );
      return {
        output: { dataStream: result },
        message: `Updated data stream **${result.displayName}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.dataStreamId)
        throw googleAnalyticsServiceError('dataStreamId is required for delete action.');
      await client.deleteDataStream(propertyId, ctx.input.dataStreamId);
      return {
        output: { deleted: true },
        message: `Deleted data stream **${ctx.input.dataStreamId}**.`
      };
    }

    if (action === 'list_secrets') {
      if (!ctx.input.dataStreamId)
        throw googleAnalyticsServiceError('dataStreamId is required for list_secrets action.');
      let result = await client.listMeasurementProtocolSecrets(
        propertyId,
        ctx.input.dataStreamId,
        {
          pageSize: ctx.input.pageSize,
          pageToken: ctx.input.pageToken
        }
      );
      let secrets = result.measurementProtocolSecrets || [];
      return {
        output: {
          secrets,
          nextPageToken: result.nextPageToken
        },
        message: `Found **${secrets.length}** Measurement Protocol secret(s) for data stream ${ctx.input.dataStreamId}.`
      };
    }

    if (action === 'create_secret') {
      if (!ctx.input.dataStreamId || !ctx.input.secretDisplayName) {
        throw googleAnalyticsServiceError(
          'dataStreamId and secretDisplayName are required for create_secret action.'
        );
      }
      let result = await client.createMeasurementProtocolSecret(
        propertyId,
        ctx.input.dataStreamId,
        {
          displayName: ctx.input.secretDisplayName
        }
      );
      return {
        output: { secret: result },
        message: `Created Measurement Protocol secret **${result.displayName}**.`
      };
    }

    if (action === 'delete_secret') {
      if (!ctx.input.dataStreamId || !ctx.input.secretId) {
        throw googleAnalyticsServiceError(
          'dataStreamId and secretId are required for delete_secret action.'
        );
      }
      await client.deleteMeasurementProtocolSecret(
        propertyId,
        ctx.input.dataStreamId,
        ctx.input.secretId
      );
      return {
        output: { deleted: true },
        message: `Deleted Measurement Protocol secret **${ctx.input.secretId}**.`
      };
    }

    throw googleAnalyticsServiceError(`Unknown action: ${action}`);
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let manageGeofence = SlateTool.create(spec, {
  name: 'Manage Geofence',
  key: 'manage_geofence',
  description: `Create, update, or delete a geofence. Geofences define circular geographic areas that trigger campaigns when users enter the zone.
Use **action "create"** to define a new geofence with coordinates and radius, **"update"** to modify an existing one, or **"delete"** to remove it.`,
  instructions: [
    'For "create", name, latitude, longitude, and radius are required.',
    'For "update", provide the geofenceId and only the fields you want to change.',
    'For "delete", only geofenceId is needed.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      geofenceId: z
        .number()
        .optional()
        .describe('ID of the geofence (required for update and delete)'),
      name: z.string().optional().describe('Name of the geofence'),
      latitude: z.number().optional().describe('Latitude of the geofence center'),
      longitude: z.number().optional().describe('Longitude of the geofence center'),
      radius: z.number().optional().describe('Radius of the geofence in meters'),
      placeId: z.number().optional().describe('Associated place ID'),
      campaign: z
        .object({
          contentType: z
            .number()
            .describe('Campaign type: 0=None, 1=Custom URL, 2=Landing Page, 3=Form'),
          customUrl: z.string().optional().describe('Target URL'),
          markdownCardId: z.number().optional().describe('Landing page ID'),
          formId: z.number().optional().describe('Form ID'),
          active: z.boolean().optional().describe('Whether the campaign is active')
        })
        .optional()
        .describe('Campaign to associate with the geofence')
    })
  )
  .output(
    z.object({
      geofenceId: z.number().optional().describe('ID of the geofence'),
      name: z.string().optional().describe('Name of the geofence'),
      latitude: z.number().optional().describe('Latitude'),
      longitude: z.number().optional().describe('Longitude'),
      radius: z.number().optional().describe('Radius in meters'),
      deleted: z.boolean().optional().describe('Whether the geofence was deleted'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let campaignData: Record<string, unknown> | undefined;
    if (ctx.input.campaign) {
      campaignData = { content_type: ctx.input.campaign.contentType };
      if (ctx.input.campaign.customUrl !== undefined)
        campaignData.custom_url = ctx.input.campaign.customUrl;
      if (ctx.input.campaign.markdownCardId !== undefined)
        campaignData.markdown_card = ctx.input.campaign.markdownCardId;
      if (ctx.input.campaign.formId !== undefined)
        campaignData.form = ctx.input.campaign.formId;
      if (ctx.input.campaign.active !== undefined)
        campaignData.campaign_active = ctx.input.campaign.active;
    }

    if (ctx.input.action === 'create') {
      let orgId = ctx.config.organizationId ? Number(ctx.config.organizationId) : undefined;
      let result = await client.createGeofence({
        name: ctx.input.name!,
        latitude: ctx.input.latitude!,
        longitude: ctx.input.longitude!,
        radius: ctx.input.radius!,
        place: ctx.input.placeId,
        campaign: campaignData,
        organization: orgId
      });

      return {
        output: {
          geofenceId: result.id,
          name: result.name,
          latitude: result.latitude,
          longitude: result.longitude,
          radius: result.radius,
          createdAt: result.created,
          updatedAt: result.updated
        },
        message: `Created geofence **"${result.name}"** (ID: ${result.id}) at (${result.latitude}, ${result.longitude}) with radius ${result.radius}m.`
      };
    }

    if (ctx.input.action === 'update') {
      let data: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.latitude !== undefined) data.latitude = ctx.input.latitude;
      if (ctx.input.longitude !== undefined) data.longitude = ctx.input.longitude;
      if (ctx.input.radius !== undefined) data.radius = ctx.input.radius;
      if (ctx.input.placeId !== undefined) data.place = ctx.input.placeId;
      if (campaignData) data.campaign = campaignData;

      let result = await client.updateGeofence(ctx.input.geofenceId!, data);

      return {
        output: {
          geofenceId: result.id,
          name: result.name,
          latitude: result.latitude,
          longitude: result.longitude,
          radius: result.radius,
          updatedAt: result.updated
        },
        message: `Updated geofence **"${result.name}"** (ID: ${result.id}).`
      };
    }

    // delete
    await client.deleteGeofence(ctx.input.geofenceId!);

    return {
      output: {
        geofenceId: ctx.input.geofenceId,
        deleted: true
      },
      message: `Deleted geofence with ID **${ctx.input.geofenceId}**.`
    };
  })
  .build();

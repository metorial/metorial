import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let siteSchema = z.record(z.string(), z.any()).describe('PV Power Site configuration object');

export let managePvPowerSite = SlateTool.create(spec, {
  name: 'Manage PV Power Site',
  key: 'manage_pv_power_site',
  description: `Create, update, or delete a PV Power Site for use with the Advanced PV Power model. PV Power Sites store detailed system specifications including capacity, tracking type, module type, derating factors, bifacial settings, and more.

Supports the following operations:
- **create**: Create a new PV Power Site
- **update**: Partially update an existing site's specifications
- **replace**: Fully overwrite an existing site's specifications
- **delete**: Delete a PV Power Site

Site management operations do not consume API request quota.`,
  instructions: [
    'Use "create" to set up a new site before fetching advanced PV power data. Provide name, latitude, longitude, capacity, capacityDc, trackingType, and installDate.',
    'Use "update" for partial changes (only modified fields need to be provided).',
    'Use "replace" to fully overwrite all site specifications.',
    'The returned resource_id is needed for advanced PV power data requests.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['create', 'update', 'replace', 'delete'])
        .describe('Operation to perform on the PV Power Site'),
      resourceId: z
        .string()
        .optional()
        .describe(
          'Resource ID from list_pv_power_sites (required for update, replace, delete)'
        ),
      name: z.string().optional().describe('Display name for the site'),
      latitude: z.number().min(-90).max(90).optional().describe('Latitude of the site'),
      longitude: z.number().min(-180).max(180).optional().describe('Longitude of the site'),
      capacity: z.number().positive().optional().describe('AC capacity in kW'),
      capacityDc: z.number().positive().optional().describe('DC capacity in kW'),
      azimuth: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Panel azimuth angle (-180 to 180, north=0, east=-90)'),
      tilt: z.number().min(0).max(90).optional().describe('Panel tilt angle in degrees'),
      trackingType: z
        .enum(['fixed', 'horizontal_single_axis', 'vertical_single_axis', 'dual_axis'])
        .optional()
        .describe('Solar tracking type'),
      installDate: z.string().optional().describe('Installation date (ISO 8601 date)'),
      gridExportLimit: z
        .number()
        .optional()
        .describe('Grid export limit in kW; use -1 to remove a configured limit'),
      moduleType: z.string().optional().describe('PV module type'),
      groundCoverageRatio: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Ground coverage ratio (0 to 1)'),
      deratingTempModule: z
        .number()
        .optional()
        .describe('Temperature derating coefficient for the module'),
      deratingAgeSystem: z.number().optional().describe('Age-based derating factor'),
      deratingInverterEfficiency: z
        .number()
        .optional()
        .describe('Peak inverter efficiency fraction (0.01 to 1)'),
      terrainSlope: z.number().optional().describe('Terrain slope in degrees'),
      terrainAzimuth: z.number().optional().describe('Terrain azimuth angle'),
      dustSoilingAverage: z
        .array(z.number())
        .optional()
        .describe('Monthly average dust soiling losses (12 values, one per month)'),
      bifacialSystemEnabled: z
        .boolean()
        .optional()
        .describe('Enable bifacial PV system modelling'),
      deratingOtherSystem: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Non-temperature, non-age system loss fraction'),
      trackerAxisAzimuth: z
        .number()
        .min(-180)
        .max(180)
        .optional()
        .describe('Tracker axis azimuth in degrees; east is -90'),
      trackerMaxRotationAngle: z
        .number()
        .min(0)
        .max(90)
        .optional()
        .describe('Maximum tracker rotation from horizontal in degrees'),
      trackerBackTracking: z.boolean().optional().describe('Enable tracker backtracking'),
      trackerSmartTracking: z
        .boolean()
        .optional()
        .describe('Move trackers horizontally during cloudy periods'),
      siteGroundAlbedo: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Ground reflection fraction beneath the modules'),
      bifacialityFactor: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Rear efficiency as a fraction of front efficiency'),
      pvrowHeight: z.number().positive().optional().describe('PV row center height in metres'),
      pvrowWidth: z
        .number()
        .positive()
        .optional()
        .describe('PV row cross-section width in metres'),
      siteTag: z.string().optional().describe('Custom tag for the site'),
      confirmOverwrite: z
        .string()
        .optional()
        .describe('Confirmation string for overwrite operations')
    })
  )
  .output(
    z.object({
      site: siteSchema
        .optional()
        .describe('The created or updated PV Power Site (not returned for delete)'),
      deleted: z.boolean().optional().describe('Whether the site was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { operation, resourceId, ...siteData } = ctx.input;
    if (
      siteData.dustSoilingAverage &&
      (siteData.dustSoilingAverage.length !== 12 ||
        siteData.dustSoilingAverage.some(value => value < 0 || value > 1))
    ) {
      throw createApiServiceError(
        'dustSoilingAverage must contain 12 monthly loss fractions between 0 and 1.'
      );
    }
    if (siteData.groundCoverageRatio !== undefined && siteData.groundCoverageRatio < 0.01)
      throw createApiServiceError('groundCoverageRatio must be between 0.01 and 1.');
    if (
      siteData.deratingInverterEfficiency !== undefined &&
      (siteData.deratingInverterEfficiency < 0.01 || siteData.deratingInverterEfficiency > 1)
    )
      throw createApiServiceError(
        'deratingInverterEfficiency must be a peak efficiency fraction between 0.01 and 1.'
      );
    if (
      siteData.gridExportLimit !== undefined &&
      siteData.gridExportLimit < 0 &&
      siteData.gridExportLimit !== -1
    )
      throw createApiServiceError(
        'gridExportLimit must be nonnegative in kW, or -1 to remove the configured limit.'
      );
    if (
      siteData.installDate !== undefined &&
      !Number.isFinite(Date.parse(siteData.installDate))
    )
      throw createApiServiceError('installDate must be an ISO 8601 date or datetime.');

    if (operation === 'create') {
      if (
        !siteData.name ||
        siteData.latitude === undefined ||
        siteData.longitude === undefined ||
        siteData.capacity === undefined ||
        siteData.capacityDc === undefined ||
        !siteData.trackingType ||
        !siteData.installDate
      ) {
        throw createApiServiceError(
          'name, latitude, longitude, capacity, capacityDc, trackingType, and installDate are required for creating a PV Power Site.'
        );
      }
      let site = await client.createPvPowerSite({
        ...siteData,
        name: siteData.name,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        capacity: siteData.capacity
      });
      return {
        output: { site },
        message: `Created PV Power Site **${siteData.name}**.`
      };
    }

    if (!resourceId) {
      throw createApiServiceError(
        'resourceId is required for update, replace, and delete operations.'
      );
    }

    if (operation === 'update') {
      let site = await client.updatePvPowerSite({ resourceId, ...siteData });
      return {
        output: { site },
        message: `Updated PV Power Site \`${resourceId}\`.`
      };
    }

    if (operation === 'replace') {
      if (
        !siteData.name ||
        siteData.latitude === undefined ||
        siteData.longitude === undefined ||
        siteData.capacity === undefined ||
        siteData.capacityDc === undefined ||
        !siteData.trackingType ||
        !siteData.installDate
      ) {
        throw createApiServiceError(
          'name, latitude, longitude, capacity, capacityDc, trackingType, and installDate are required for replacing a PV Power Site.'
        );
      }
      let site = await client.replacePvPowerSite({
        resourceId,
        ...siteData,
        name: siteData.name,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        capacity: siteData.capacity
      });
      return {
        output: { site },
        message: `Replaced PV Power Site \`${resourceId}\` with new specifications.`
      };
    }

    // delete
    await client.deletePvPowerSite(resourceId);
    return {
      output: { deleted: true },
      message: `Deleted PV Power Site \`${resourceId}\`.`
    };
  })
  .build();

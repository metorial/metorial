import { SlateTool } from 'slates';
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
    'Use "create" to set up a new site before fetching advanced PV power data.',
    'Use "update" for partial changes (only modified fields need to be provided).',
    'Use "replace" to fully overwrite all site specifications.',
    'The returned resourceId is needed for advanced PV power data requests.'
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
        .describe('Resource ID of the site (required for update, replace, delete)'),
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
        .describe('Panel azimuth angle (-180 to 180, north=0, east=90)'),
      tilt: z.number().min(0).max(90).optional().describe('Panel tilt angle in degrees'),
      trackingType: z
        .enum(['fixed', 'horizontal_single_axis', 'vertical_single_axis', 'dual_axis'])
        .optional()
        .describe('Solar tracking type'),
      installDate: z.string().optional().describe('Installation date (ISO 8601 date)'),
      gridExportLimit: z.number().optional().describe('Grid export limit in kW'),
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
        .describe('Inverter efficiency derating factor'),
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

    if (operation === 'create') {
      if (
        !siteData.name ||
        siteData.latitude === undefined ||
        siteData.longitude === undefined ||
        siteData.capacity === undefined
      ) {
        throw new Error(
          'name, latitude, longitude, and capacity are required for creating a PV Power Site.'
        );
      }
      let site = await client.createPvPowerSite({
        name: siteData.name,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        capacity: siteData.capacity,
        capacityDc: siteData.capacityDc,
        azimuth: siteData.azimuth,
        tilt: siteData.tilt,
        trackingType: siteData.trackingType,
        installDate: siteData.installDate,
        gridExportLimit: siteData.gridExportLimit,
        moduleType: siteData.moduleType,
        groundCoverageRatio: siteData.groundCoverageRatio,
        deratingTempModule: siteData.deratingTempModule,
        deratingAgeSystem: siteData.deratingAgeSystem,
        deratingInverterEfficiency: siteData.deratingInverterEfficiency,
        terrainSlope: siteData.terrainSlope,
        terrainAzimuth: siteData.terrainAzimuth,
        dustSoilingAverage: siteData.dustSoilingAverage,
        bifacialSystemEnabled: siteData.bifacialSystemEnabled,
        siteTag: siteData.siteTag,
        confirmOverwrite: siteData.confirmOverwrite
      });
      return {
        output: { site },
        message: `Created PV Power Site **${siteData.name}**.`
      };
    }

    if (!resourceId) {
      throw new Error('resourceId is required for update, replace, and delete operations.');
    }

    if (operation === 'update') {
      let site = await client.updatePvPowerSite({
        resourceId,
        name: siteData.name,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        capacity: siteData.capacity,
        capacityDc: siteData.capacityDc,
        azimuth: siteData.azimuth,
        tilt: siteData.tilt,
        trackingType: siteData.trackingType,
        installDate: siteData.installDate,
        gridExportLimit: siteData.gridExportLimit,
        moduleType: siteData.moduleType,
        groundCoverageRatio: siteData.groundCoverageRatio,
        deratingTempModule: siteData.deratingTempModule,
        deratingAgeSystem: siteData.deratingAgeSystem,
        deratingInverterEfficiency: siteData.deratingInverterEfficiency,
        terrainSlope: siteData.terrainSlope,
        terrainAzimuth: siteData.terrainAzimuth,
        dustSoilingAverage: siteData.dustSoilingAverage,
        bifacialSystemEnabled: siteData.bifacialSystemEnabled,
        siteTag: siteData.siteTag
      });
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
        siteData.capacity === undefined
      ) {
        throw new Error(
          'name, latitude, longitude, and capacity are required for replacing a PV Power Site.'
        );
      }
      let site = await client.replacePvPowerSite({
        resourceId,
        name: siteData.name,
        latitude: siteData.latitude,
        longitude: siteData.longitude,
        capacity: siteData.capacity,
        capacityDc: siteData.capacityDc,
        azimuth: siteData.azimuth,
        tilt: siteData.tilt,
        trackingType: siteData.trackingType,
        installDate: siteData.installDate,
        gridExportLimit: siteData.gridExportLimit,
        moduleType: siteData.moduleType,
        groundCoverageRatio: siteData.groundCoverageRatio,
        deratingTempModule: siteData.deratingTempModule,
        deratingAgeSystem: siteData.deratingAgeSystem,
        deratingInverterEfficiency: siteData.deratingInverterEfficiency,
        terrainSlope: siteData.terrainSlope,
        terrainAzimuth: siteData.terrainAzimuth,
        dustSoilingAverage: siteData.dustSoilingAverage,
        bifacialSystemEnabled: siteData.bifacialSystemEnabled,
        siteTag: siteData.siteTag,
        confirmOverwrite: siteData.confirmOverwrite
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

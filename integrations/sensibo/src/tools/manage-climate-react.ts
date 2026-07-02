import { SlateTool } from 'slates';
import { z } from 'zod';
import { SensiboClient } from '../lib/client';
import { spec } from '../spec';

let climateReactAcStateSchema = z.object({
  on: z.boolean().optional(),
  mode: z.enum(['cool', 'heat', 'fan', 'dry', 'auto']).optional(),
  targetTemperature: z.number().optional(),
  temperatureUnit: z.enum(['C', 'F']).optional(),
  fanLevel: z.string().optional(),
  swing: z.string().optional()
});

export let manageClimateReactTool = SlateTool.create(spec, {
  name: 'Manage Climate React',
  key: 'manage_climate_react',
  description: `Get or configure Sensibo's Climate React automation. Climate React automatically adjusts your AC when temperature or humidity crosses defined thresholds. Use action "get" to view the current configuration, "enable" or "disable" to toggle it, or "configure" to set up the full automation rules.`,
  instructions: [
    'Trigger types: "temperature", "feelsLike", or "humidity".',
    'Define separate AC states for when the value goes above the high threshold or below the low threshold.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      deviceId: z.string().describe('The unique ID of the Sensibo device'),
      action: z.enum(['get', 'enable', 'disable', 'configure']).describe('Action to perform'),
      triggerType: z
        .enum(['temperature', 'feelsLike', 'humidity'])
        .optional()
        .describe('What triggers the automation'),
      highThreshold: z
        .number()
        .optional()
        .describe('Upper threshold value that triggers the above-threshold AC state'),
      lowThreshold: z
        .number()
        .optional()
        .describe('Lower threshold value that triggers the below-threshold AC state'),
      aboveThresholdAcState: climateReactAcStateSchema
        .optional()
        .describe('AC state to apply when value exceeds high threshold'),
      belowThresholdAcState: climateReactAcStateSchema
        .optional()
        .describe('AC state to apply when value drops below low threshold')
    })
  )
  .output(
    z.object({
      deviceId: z.string().describe('The device Climate React belongs to'),
      enabled: z.boolean().describe('Whether Climate React is enabled'),
      triggerType: z.string().optional().describe('What triggers the automation'),
      highThreshold: z.number().optional().describe('Upper threshold value'),
      lowThreshold: z.number().optional().describe('Lower threshold value'),
      aboveThresholdAcState: climateReactAcStateSchema
        .optional()
        .describe('AC state for above-threshold'),
      belowThresholdAcState: climateReactAcStateSchema
        .optional()
        .describe('AC state for below-threshold')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SensiboClient(ctx.auth.token);
    let { deviceId, action } = ctx.input;

    if (action === 'get') {
      let smartMode = await client.getClimateReact(deviceId);
      return {
        output: {
          deviceId,
          enabled: smartMode?.enabled ?? false,
          triggerType: smartMode?.type,
          highThreshold: smartMode?.highTemperatureThreshold ?? smartMode?.highThreshold,
          lowThreshold: smartMode?.lowTemperatureThreshold ?? smartMode?.lowThreshold,
          aboveThresholdAcState:
            smartMode?.highTemperatureState ?? smartMode?.aboveThresholdState,
          belowThresholdAcState:
            smartMode?.lowTemperatureState ?? smartMode?.belowThresholdState
        },
        message: smartMode?.enabled
          ? `Climate React is **enabled** on device **${deviceId}** (trigger: ${smartMode.type}).`
          : `Climate React is **disabled** on device **${deviceId}**.`
      };
    }

    if (action === 'enable') {
      let result = await client.updateClimateReact(deviceId, { enabled: true });
      return {
        output: {
          deviceId,
          enabled: true,
          triggerType: result?.type,
          highThreshold: result?.highTemperatureThreshold ?? result?.highThreshold,
          lowThreshold: result?.lowTemperatureThreshold ?? result?.lowThreshold,
          aboveThresholdAcState: result?.highTemperatureState ?? result?.aboveThresholdState,
          belowThresholdAcState: result?.lowTemperatureState ?? result?.belowThresholdState
        },
        message: `Climate React **enabled** on device **${deviceId}**.`
      };
    }

    if (action === 'disable') {
      let result = await client.updateClimateReact(deviceId, { enabled: false });
      return {
        output: {
          deviceId,
          enabled: false,
          triggerType: result?.type,
          highThreshold: result?.highTemperatureThreshold ?? result?.highThreshold,
          lowThreshold: result?.lowTemperatureThreshold ?? result?.lowThreshold,
          aboveThresholdAcState: result?.highTemperatureState ?? result?.aboveThresholdState,
          belowThresholdAcState: result?.lowTemperatureState ?? result?.belowThresholdState
        },
        message: `Climate React **disabled** on device **${deviceId}**.`
      };
    }

    // action === 'configure'
    let configData: Record<string, any> = {
      enabled: true
    };
    if (ctx.input.triggerType) configData.type = ctx.input.triggerType;
    if (ctx.input.highThreshold !== undefined) {
      configData.highTemperatureThreshold = ctx.input.highThreshold;
    }
    if (ctx.input.lowThreshold !== undefined) {
      configData.lowTemperatureThreshold = ctx.input.lowThreshold;
    }
    if (ctx.input.aboveThresholdAcState) {
      configData.highTemperatureState = ctx.input.aboveThresholdAcState;
    }
    if (ctx.input.belowThresholdAcState) {
      configData.lowTemperatureState = ctx.input.belowThresholdAcState;
    }

    let result = await client.configureClimateReact(deviceId, configData);
    return {
      output: {
        deviceId,
        enabled: result?.enabled ?? true,
        triggerType: result?.type ?? ctx.input.triggerType,
        highThreshold: result?.highTemperatureThreshold ?? ctx.input.highThreshold,
        lowThreshold: result?.lowTemperatureThreshold ?? ctx.input.lowThreshold,
        aboveThresholdAcState: result?.highTemperatureState ?? ctx.input.aboveThresholdAcState,
        belowThresholdAcState: result?.lowTemperatureState ?? ctx.input.belowThresholdAcState
      },
      message: `Climate React **configured** on device **${deviceId}** with trigger type "${ctx.input.triggerType}" (thresholds: ${ctx.input.lowThreshold}-${ctx.input.highThreshold}).`
    };
  })
  .build();

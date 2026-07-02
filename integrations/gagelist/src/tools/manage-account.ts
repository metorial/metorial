import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountStatus = SlateTool.create(spec, {
  name: 'Get Account Status',
  key: 'get_account_status',
  description: `Retrieve the current account status from GageList.
Returns general information about the GageList account.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountStatus: z.any().describe('Account status data returned by GageList'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAccountStatus();

    return {
      output: {
        accountStatus: result.data,
        success: result.success
      },
      message: `Retrieved account status successfully.`
    };
  })
  .build();

export let getAccountSettings = SlateTool.create(spec, {
  name: 'Get Account Settings',
  key: 'get_account_settings',
  description: `Retrieve the current account settings from GageList.
Returns all configurable settings including available statuses, types, locations, measurement options, notification preferences, and display field configurations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      allTypes: z.array(z.string()).optional().describe('Available gage types'),
      allStatuses: z.array(z.string()).optional().describe('All available status values'),
      allActiveStatuses: z.array(z.string()).optional().describe('Active status values'),
      allLocations: z.array(z.string()).optional().describe('Available locations'),
      allAreas: z.array(z.string()).optional().describe('Available areas'),
      allUnitOfMeasure: z.array(z.string()).optional().describe('Available units of measure'),
      allTypesMeasurement: z
        .array(z.string())
        .optional()
        .describe('Available measurement types'),
      allConditionAcquired: z
        .array(z.string())
        .optional()
        .describe('Available condition values'),
      allInterval: z
        .array(z.string())
        .optional()
        .describe('Available calibration interval options'),
      allCalibrationEnvironment: z
        .array(z.string())
        .optional()
        .describe('Available calibration environments'),
      allCalibrationInstructions: z
        .array(z.string())
        .optional()
        .describe('Available calibration instructions'),
      allAssignees: z.array(z.string()).optional().describe('Available assignees'),
      timeZone: z.string().optional().describe('Account time zone'),
      dateFormat: z.string().optional().describe('Date format preference'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAccountSettings();
    let settings = result.data;

    return {
      output: {
        allTypes: settings?.AllType,
        allStatuses: settings?.AllStatuses,
        allActiveStatuses: settings?.AllActiveStatuses,
        allLocations: settings?.AllLocation,
        allAreas: settings?.AllArea,
        allUnitOfMeasure: settings?.AllUnitOfMeasure,
        allTypesMeasurement: settings?.AllTypesMeasurement,
        allConditionAcquired: settings?.AllConditionAquired,
        allInterval: settings?.AllInterval,
        allCalibrationEnvironment: settings?.AllCalibrationEnvironment,
        allCalibrationInstructions: settings?.AllCalibrationInstructions,
        allAssignees: settings?.AllAssignees,
        timeZone: settings?.MyTimeZone,
        dateFormat: settings?.DateFormat,
        success: result.success
      },
      message: `Retrieved account settings successfully.`
    };
  })
  .build();

export let updateAccountSettings = SlateTool.create(spec, {
  name: 'Update Account Settings',
  key: 'update_account_settings',
  description: `Update account-level settings in GageList.
Allows modifying account configuration such as notification preferences, email settings, and display options.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      notificationType: z.string().optional().describe('Notification type setting'),
      notificationDays: z.array(z.string()).optional().describe('Notification day settings'),
      emailSubject: z.string().optional().describe('Notification email subject'),
      introductionText: z.string().optional().describe('Introduction text for notifications'),
      includeOverdue: z.string().optional().describe('Whether to include overdue items'),
      distributions: z
        .array(z.string())
        .optional()
        .describe('Distribution list for notifications'),
      statement: z.string().optional().describe('Account statement text')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {};
    if (ctx.input.notificationType !== undefined)
      data.NotificationType = ctx.input.notificationType;
    if (ctx.input.notificationDays !== undefined)
      data.NotificationDays = ctx.input.notificationDays;
    if (ctx.input.emailSubject !== undefined) data.EmailSubject = ctx.input.emailSubject;
    if (ctx.input.introductionText !== undefined)
      data.IntroductionText = ctx.input.introductionText;
    if (ctx.input.includeOverdue !== undefined) data.IncludeOverdue = ctx.input.includeOverdue;
    if (ctx.input.distributions !== undefined) data.Distributions = ctx.input.distributions;
    if (ctx.input.statement !== undefined) data.Statement = ctx.input.statement;

    let result = await client.updateAccountSettings(data);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Updated account settings successfully.`
    };
  })
  .build();

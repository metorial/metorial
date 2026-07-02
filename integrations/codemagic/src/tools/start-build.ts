import { SlateTool } from 'slates';
import { z } from 'zod';
import { CodemagicClient } from '../lib/client';
import { spec } from '../spec';

export let startBuild = SlateTool.create(spec, {
  name: 'Start Build',
  key: 'start_build',
  description: `Trigger a new build for a Codemagic application. Specify the application, workflow, and branch or tag to build. Optionally override environment variables, software versions (Xcode, Flutter), and machine type.`,
  instructions: [
    'Either branch or tag must be provided, but not both.',
    'Trigger configuration in codemagic.yaml is ignored when starting builds via API.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('ID of the application to build'),
      workflowId: z.string().describe('ID of the workflow to run'),
      branch: z.string().optional().describe('Git branch to build from'),
      tag: z.string().optional().describe('Git tag to build from'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Labels to attach to the build for identification'),
      environmentVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom environment variables as key-value pairs'),
      variableGroups: z
        .array(z.string())
        .optional()
        .describe('Names of variable groups to include'),
      softwareVersions: z
        .object({
          xcode: z.string().optional().describe('Xcode version, e.g. "15.2"'),
          flutter: z.string().optional().describe('Flutter version, e.g. "3.19.0"'),
          cocoapods: z.string().optional().describe('CocoaPods version')
        })
        .optional()
        .describe('Software version overrides'),
      instanceType: z
        .string()
        .optional()
        .describe('Machine type, e.g. "mac_mini_m2", "mac_pro_m2", "linux_x2"')
    })
  )
  .output(
    z.object({
      buildId: z.string().describe('ID of the started build')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CodemagicClient({ token: ctx.auth.token });

    let environment:
      | {
          variables?: Record<string, string>;
          groups?: string[];
          softwareVersions?: Record<string, string>;
        }
      | undefined;

    if (
      ctx.input.environmentVariables ||
      ctx.input.variableGroups ||
      ctx.input.softwareVersions
    ) {
      environment = {};
      if (ctx.input.environmentVariables)
        environment.variables = ctx.input.environmentVariables;
      if (ctx.input.variableGroups) environment.groups = ctx.input.variableGroups;
      if (ctx.input.softwareVersions) {
        let sv: Record<string, string> = {};
        if (ctx.input.softwareVersions.xcode) sv.xcode = ctx.input.softwareVersions.xcode;
        if (ctx.input.softwareVersions.flutter)
          sv.flutter = ctx.input.softwareVersions.flutter;
        if (ctx.input.softwareVersions.cocoapods)
          sv.cocoapods = ctx.input.softwareVersions.cocoapods;
        environment.softwareVersions = sv;
      }
    }

    let result = await client.startBuild({
      appId: ctx.input.appId,
      workflowId: ctx.input.workflowId,
      branch: ctx.input.branch,
      tag: ctx.input.tag,
      labels: ctx.input.labels,
      environment,
      instanceType: ctx.input.instanceType
    });

    return {
      output: { buildId: result.buildId },
      message: `Started build **${result.buildId}** for app \`${ctx.input.appId}\` on ${ctx.input.branch ? `branch \`${ctx.input.branch}\`` : `tag \`${ctx.input.tag}\``}.`
    };
  })
  .build();

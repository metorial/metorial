import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let getSystemInfo = SlateTool.create(spec, {
  name: 'Get System Info',
  key: 'get_system_info',
  description: `Retrieve Jenkins server information including mode, description, number of executors, and the authenticated user's identity.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      mode: z.string().optional().describe('Jenkins mode (NORMAL or EXCLUSIVE)'),
      nodeDescription: z
        .string()
        .optional()
        .describe('Description of the Jenkins master node'),
      numExecutors: z.number().optional().describe('Number of executors on the master'),
      quietingDown: z
        .boolean()
        .optional()
        .describe('Whether Jenkins is preparing to shut down'),
      useSecurity: z.boolean().optional().describe('Whether security is enabled'),
      primaryView: z.string().optional().describe('Name of the primary view'),
      slaveAgentPort: z.number().optional().describe('TCP port for inbound agent connections'),
      jobCount: z.number().optional().describe('Number of top-level jobs'),
      viewCount: z.number().optional().describe('Number of views'),
      currentUser: z
        .object({
          userId: z.string().optional().describe('Current user ID'),
          fullName: z.string().optional().describe('Current user full name')
        })
        .optional()
        .describe('Authenticated user information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let [systemInfo, whoAmI] = await Promise.all([
      client.getSystemInfo(),
      client.whoAmI().catch(() => null)
    ]);

    return {
      output: {
        mode: systemInfo.mode,
        nodeDescription: systemInfo.nodeDescription,
        numExecutors: systemInfo.numExecutors,
        quietingDown: systemInfo.quietingDown,
        useSecurity: systemInfo.useSecurity,
        primaryView: systemInfo.primaryView?.name,
        slaveAgentPort: systemInfo.slaveAgentPort,
        jobCount: systemInfo.jobs?.length,
        viewCount: systemInfo.views?.length,
        currentUser: whoAmI
          ? {
              userId: whoAmI.id,
              fullName: whoAmI.fullName
            }
          : undefined
      },
      message: `Jenkins server — mode: **${systemInfo.mode}**, ${systemInfo.numExecutors} executor(s), ${systemInfo.jobs?.length || 0} job(s), ${systemInfo.views?.length || 0} view(s).${systemInfo.quietingDown ? ' **Quieting down.**' : ''}`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve SES account details including sending quotas, reputation status, enforcement status, and whether the account has production access. Also shows suppression and Virtual Deliverability Manager (VDM) settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      dedicatedIpAutoWarmupEnabled: z
        .boolean()
        .describe('Whether automatic IP warmup is enabled'),
      details: z
        .object({
          additionalContactEmailAddresses: z.array(z.string()).optional(),
          contactLanguage: z.string().optional(),
          mailType: z.string().optional(),
          reviewDetails: z
            .object({
              caseId: z.string().optional(),
              status: z.string().optional()
            })
            .optional(),
          useCaseDescription: z.string().optional(),
          websiteUrl: z.string().optional()
        })
        .optional()
        .describe('SES account details and production access review status'),
      enforcementStatus: z
        .string()
        .describe('Account enforcement status (HEALTHY, PROBATION, SHUTDOWN)'),
      productionAccessEnabled: z
        .boolean()
        .describe('Whether the account has left the SES sandbox'),
      sendingEnabled: z.boolean().describe('Whether email sending is enabled'),
      sendQuota: z
        .object({
          max24HourSend: z.number().describe('Maximum emails allowed in 24 hours'),
          maxSendRate: z.number().describe('Maximum emails per second'),
          sentLast24Hours: z.number().describe('Emails sent in the last 24 hours')
        })
        .describe('Sending quota and usage'),
      suppressionAttributes: z
        .object({
          suppressedReasons: z.array(z.string()),
          validationAttributes: z
            .object({
              conditionThreshold: z
                .object({
                  conditionThresholdEnabled: z.string().optional(),
                  overallConfidenceThreshold: z
                    .object({
                      confidenceVerdictThreshold: z.string().optional()
                    })
                    .optional()
                })
                .optional()
            })
            .optional()
        })
        .optional()
        .describe('Account suppression settings'),
      vdmAttributes: z
        .object({
          vdmEnabled: z.string(),
          dashboardAttributes: z
            .object({
              engagementMetrics: z.string()
            })
            .optional(),
          guardianAttributes: z
            .object({
              optimizedSharedDelivery: z.string()
            })
            .optional()
        })
        .optional()
        .describe('Virtual Deliverability Manager settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let account = await client.getAccount();

    let sandboxStatus = account.productionAccessEnabled ? 'production' : 'sandbox';

    return {
      output: account,
      message: `SES account is in **${sandboxStatus}** mode. Enforcement: **${account.enforcementStatus}**. Sent ${account.sendQuota.sentLast24Hours}/${account.sendQuota.max24HourSend} emails in the last 24h. Max rate: ${account.sendQuota.maxSendRate}/sec.`
    };
  })
  .build();

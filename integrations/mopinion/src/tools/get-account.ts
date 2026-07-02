import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve information about your Mopinion account, including organization name, subscription package, form/report counts, and associated reports.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().describe('Account/organization name'),
      packageName: z.string().describe('Subscription package name'),
      endDate: z.string().describe('Subscription end date'),
      numberUsers: z.number().describe('Number of users in the account'),
      numberCharts: z.number().describe('Number of charts'),
      numberForms: z.number().describe('Number of feedback forms'),
      numberReports: z.number().describe('Number of reports'),
      reports: z.array(z.any()).describe('List of reports associated with the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    let account = await client.getAccount();

    return {
      output: {
        name: account.name || '',
        packageName: account.package || '',
        endDate: account.endDate || account.end_date || '',
        numberUsers: account.numberUsers ?? account.number_users ?? 0,
        numberCharts: account.numberCharts ?? account.number_charts ?? 0,
        numberForms: account.numberForms ?? account.number_forms ?? 0,
        numberReports: account.numberReports ?? account.number_reports ?? 0,
        reports: account.reports || []
      },
      message: `Retrieved account information for **${account.name || 'Mopinion account'}**. Package: ${account.package || 'N/A'}, Reports: ${account.numberReports ?? account.number_reports ?? 0}, Forms: ${account.numberForms ?? account.number_forms ?? 0}.`
    };
  })
  .build();

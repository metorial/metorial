import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { YouTubeAnalyticsClient } from '../lib/client';
import { youtubeAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let newBulkReports = SlateTrigger.create(spec, {
  name: 'New Bulk Reports',
  key: 'new_bulk_reports',
  description:
    'Polls for newly generated bulk reports across your YouTube Reporting API jobs. Triggers when new daily reports become available for download.'
})
  .scopes(youtubeAnalyticsActionScopes.newBulkReports)
  .input(
    z.object({
      reportId: z.string().describe('ID of the newly generated report.'),
      jobId: z.string().describe('ID of the reporting job that generated the report.'),
      jobName: z.string().describe('Name of the reporting job.'),
      reportTypeId: z.string().describe('Report type ID.'),
      startTime: z.string().describe('Start of the reporting period.'),
      endTime: z.string().describe('End of the reporting period.'),
      createTime: z.string().describe('When the report was generated.'),
      downloadUrl: z.string().describe('URL to download the report data.')
    })
  )
  .output(
    z.object({
      reportId: z.string().describe('ID of the newly generated report.'),
      jobId: z.string().describe('ID of the reporting job.'),
      jobName: z.string().describe('Name of the reporting job.'),
      reportTypeId: z.string().describe('Report type ID.'),
      startTime: z.string().describe('Start of the reporting period.'),
      endTime: z.string().describe('End of the reporting period.'),
      createTime: z.string().describe('When the report was generated.'),
      downloadUrl: z.string().describe('URL to download the report data.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new YouTubeAnalyticsClient({ token: ctx.auth.token });

      let lastPolledAt = ctx.state?.lastPolledAt as string | undefined;

      let jobsResult = await client.listReportingJobs({ includeSystemManaged: true });
      let allInputs: Array<{
        reportId: string;
        jobId: string;
        jobName: string;
        reportTypeId: string;
        startTime: string;
        endTime: string;
        createTime: string;
        downloadUrl: string;
      }> = [];

      for (let job of jobsResult.jobs) {
        let reportsResult = await client.listBulkReports(job.jobId, {
          createdAfter: lastPolledAt
        });

        for (let report of reportsResult.reports) {
          allInputs.push({
            reportId: report.reportId,
            jobId: job.jobId,
            jobName: job.name,
            reportTypeId: job.reportTypeId,
            startTime: report.startTime,
            endTime: report.endTime,
            createTime: report.createTime,
            downloadUrl: report.downloadUrl
          });
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastPolledAt: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'bulk_report.created',
        id: ctx.input.reportId,
        output: {
          reportId: ctx.input.reportId,
          jobId: ctx.input.jobId,
          jobName: ctx.input.jobName,
          reportTypeId: ctx.input.reportTypeId,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          createTime: ctx.input.createTime,
          downloadUrl: ctx.input.downloadUrl
        }
      };
    }
  })
  .build();

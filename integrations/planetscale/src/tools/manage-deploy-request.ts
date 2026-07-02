import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDeployRequest = SlateTool.create(spec, {
  name: 'Manage Deploy Request',
  key: 'manage_deploy_request',
  description: `Perform lifecycle actions on a deploy request. Get details, queue for deployment, cancel, close, approve/review, skip revert period, or complete a revert. Also retrieve deployment status and operations.`,
  instructions: [
    'Use action "get" to retrieve full deploy request details.',
    'Use action "deploy" to queue the deploy request for deployment.',
    'Use action "cancel" to cancel a queued/in-progress deploy request.',
    'Use action "close" to close the deploy request without deploying.',
    'Use action "approve" to approve the deploy request (optionally with a review comment).',
    'Use action "skip_revert" to skip the revert period after deployment.',
    'Use action "revert" to revert a deployed schema change.',
    'Use action "deployment" to get deployment status details.',
    'Use action "operations" to list deploy operations.',
    'Use action "storage_check" to check whether the target branch has enough storage for deployment.'
  ],
  constraints: [
    'Deploy requests are only available for Vitess (MySQL) databases.',
    'A service token cannot approve its own deploy request.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      deployRequestNumber: z.number().describe('Deploy request number'),
      action: z
        .enum([
          'get',
          'deploy',
          'cancel',
          'close',
          'approve',
          'skip_revert',
          'revert',
          'deployment',
          'operations',
          'storage_check'
        ])
        .describe('Action to perform'),
      reviewComment: z
        .string()
        .optional()
        .describe('Review comment (used with approve action)'),
      instantDdl: z
        .boolean()
        .optional()
        .describe('Whether to queue deployment with instant DDL (used with deploy action)'),
      page: z.number().optional().describe('Page number for operations pagination'),
      perPage: z.number().optional().describe('Results per page for operations pagination')
    })
  )
  .output(
    z.object({
      deployRequestId: z.string().optional(),
      number: z.number().optional(),
      branch: z.string().optional(),
      intoBranch: z.string().optional(),
      state: z.string().optional(),
      deploymentState: z.string().optional(),
      approved: z.boolean().optional(),
      createdAt: z.string().optional(),
      closedAt: z.string().optional(),
      deployedAt: z.string().optional(),
      htmlUrl: z.string().optional(),
      deployment: z.any().optional(),
      deployOperations: z.array(z.any()).optional(),
      storageCheck: z.any().optional(),
      currentPage: z.number().optional(),
      nextPage: z.number().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let { databaseName, deployRequestNumber, action } = ctx.input;

    if (action === 'deployment') {
      let deployment = await client.getDeployment(databaseName, deployRequestNumber);
      return {
        output: { number: deployRequestNumber, deployment },
        message: `Retrieved deployment details for deploy request **#${deployRequestNumber}**.`
      };
    }

    if (action === 'operations') {
      let result = await client.listDeployOperations(databaseName, deployRequestNumber, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      return {
        output: {
          number: deployRequestNumber,
          deployOperations: result.data,
          currentPage: result.currentPage,
          nextPage: result.nextPage
        },
        message: `Found **${result.data.length}** operation(s) for deploy request **#${deployRequestNumber}**.`
      };
    }

    if (action === 'storage_check') {
      let storageCheck = await client.checkDeployRequestStorage(
        databaseName,
        deployRequestNumber
      );
      return {
        output: { number: deployRequestNumber, storageCheck },
        message: `Checked storage for deploy request **#${deployRequestNumber}**.`
      };
    }

    let dr: any;
    switch (action) {
      case 'get':
        dr = await client.getDeployRequest(databaseName, deployRequestNumber);
        break;
      case 'deploy':
        dr = await client.deployDeployRequest(databaseName, deployRequestNumber, {
          instantDdl: ctx.input.instantDdl
        });
        break;
      case 'cancel':
        dr = await client.cancelDeployRequest(databaseName, deployRequestNumber);
        break;
      case 'close':
        dr = await client.closeDeployRequest(databaseName, deployRequestNumber);
        break;
      case 'approve':
        dr = await client.reviewDeployRequest(databaseName, deployRequestNumber, {
          state: 'approved',
          body: ctx.input.reviewComment
        });
        break;
      case 'skip_revert':
        dr = await client.skipRevertPeriod(databaseName, deployRequestNumber);
        break;
      case 'revert':
        dr = await client.completeRevert(databaseName, deployRequestNumber);
        break;
    }

    let actionLabels: Record<string, string> = {
      get: 'Retrieved',
      deploy: 'Queued for deployment',
      cancel: 'Cancelled',
      close: 'Closed',
      approve: 'Approved',
      skip_revert: 'Skipped revert period for',
      revert: 'Reverted'
    };

    return {
      output: {
        deployRequestId: dr.id,
        number: dr.number,
        branch: dr.branch,
        intoBranch: dr.into_branch,
        state: dr.state,
        deploymentState: dr.deployment_state,
        approved: dr.approved,
        createdAt: dr.created_at,
        closedAt: dr.closed_at,
        deployedAt: dr.deployed_at,
        htmlUrl: dr.html_url
      },
      message: `${actionLabels[action]} deploy request **#${deployRequestNumber}** on database **${databaseName}**.`
    };
  });

import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let flowSchema = z.object({
  flowId: z.string().optional().describe('Flow ID'),
  flowName: z.string().optional().describe('Flow name'),
  visibility: z.string().optional().describe('Flow visibility (Company, Personal, Shared)'),
  folderId: z.string().optional().describe('Folder containing the flow'),
  status: z.string().optional().describe('Flow status'),
  ownerEmail: z.string().optional().describe('Flow owner email')
});

export let listFlows = SlateTool.create(spec, {
  name: 'List Engage Flows',
  key: 'list_flows',
  description: `Retrieve available Gong Engage flows and flow folders. Returns company flows, personal flows, and shared flows for a given user. Use to browse outreach automation sequences.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowEmailOwner: z
        .string()
        .optional()
        .describe('Email of the flow owner to include personal/shared flows'),
      workspaceId: z.string().optional().describe('Filter by workspace'),
      includeFolders: z
        .boolean()
        .optional()
        .describe('Also include flow folders in the response')
    })
  )
  .output(
    z.object({
      flows: z.array(flowSchema).describe('List of Engage flows'),
      folders: z
        .array(
          z.object({
            folderId: z.string().optional().describe('Folder ID'),
            folderName: z.string().optional().describe('Folder name'),
            visibility: z.string().optional().describe('Folder visibility')
          })
        )
        .optional()
        .describe('Flow folders (if includeFolders is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let flowsResult = await client.listFlows({
      flowEmailOwner: ctx.input.flowEmailOwner,
      workspaceId: ctx.input.workspaceId
    });

    let flows = (flowsResult.flows || []).map((f: any) => ({
      flowId: f.id || f.flowId,
      flowName: f.name || f.flowName,
      visibility: f.visibility,
      folderId: f.folderId,
      status: f.status,
      ownerEmail: f.ownerEmail
    }));

    let folders: any[] | undefined;
    if (ctx.input.includeFolders) {
      let foldersResult = await client.listFlowFolders({
        flowEmailOwner: ctx.input.flowEmailOwner,
        workspaceId: ctx.input.workspaceId
      });

      folders = (foldersResult.folders || []).map((f: any) => ({
        folderId: f.id || f.folderId,
        folderName: f.name || f.folderName,
        visibility: f.visibility
      }));
    }

    return {
      output: {
        flows,
        folders
      },
      message: `Retrieved ${flows.length} flow(s)${folders ? ` and ${folders.length} folder(s)` : ''}.`
    };
  })
  .build();

export let assignProspectsToFlow = SlateTool.create(spec, {
  name: 'Assign Prospects to Flow',
  key: 'assign_prospects_to_flow',
  description: `Assign CRM prospects (contacts or leads) to a Gong Engage flow. Supports assigning up to 100 prospects in a single request. Use this to automate outreach by adding prospects to an existing flow.`,
  constraints: ['Maximum 100 prospects per request.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the Engage flow to assign prospects to'),
      flowInstanceOwnerEmail: z
        .string()
        .describe('Email of the Gong user who owns the flow instance'),
      crmProspectIds: z
        .array(z.string())
        .describe('CRM IDs of the prospects to assign (max 100)')
    })
  )
  .output(
    z.object({
      assignedProspects: z.array(z.any()).optional().describe('Details of assigned prospects'),
      unassignedProspects: z
        .array(z.any())
        .optional()
        .describe('Prospects that were not assigned'),
      errors: z.array(z.any()).optional().describe('Any errors during assignment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.assignProspectsToFlow({
      flowId: ctx.input.flowId,
      flowInstanceOwnerEmail: ctx.input.flowInstanceOwnerEmail,
      crmProspectsIds: ctx.input.crmProspectIds
    });

    return {
      output: {
        assignedProspects: result.prospectsAssigned || result.assignedProspects,
        unassignedProspects: result.prospectsNotAssigned,
        errors: result.errors
      },
      message: `Assigned ${ctx.input.crmProspectIds.length} prospect(s) to flow **${ctx.input.flowId}**.`
    };
  })
  .build();

export let unassignProspectFromFlow = SlateTool.create(spec, {
  name: 'Unassign Prospect from Flow',
  key: 'unassign_prospect_from_flow',
  description: `Remove a prospect from Gong Engage flows. Can remove from a specific flow by providing the flowId, or from all flows if only the prospect ID is provided.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      crmProspectId: z.string().describe('CRM ID of the prospect to unassign'),
      flowId: z
        .string()
        .optional()
        .describe('Specific flow ID to unassign from (omit to unassign from all flows)'),
      unassignedByUserEmail: z
        .string()
        .optional()
        .describe('Gong user email requesting the unassignment')
    })
  )
  .output(
    z.object({
      unassignedFlowIds: z
        .array(z.string())
        .optional()
        .describe('IDs of flow instances the prospect was removed from')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.unassignProspectFromFlows({
      crmProspectId: ctx.input.crmProspectId,
      flowId: ctx.input.flowId,
      unassignedByUserEmail: ctx.input.unassignedByUserEmail
    });

    let unassignedFlowIds = result.unassignedFlowInstanceIds || result.unassignedFlowIds || [];

    return {
      output: {
        unassignedFlowIds
      },
      message: `Unassigned prospect **${ctx.input.crmProspectId}** from ${unassignedFlowIds.length} flow(s).`
    };
  })
  .build();

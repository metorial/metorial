import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let collaboratorSchema = z.object({
  collaboratorId: z.string().describe('Unique ID of the collaborator'),
  templateId: z.string().optional().describe('ID of the template'),
  name: z.string().optional().describe('Name of the collaborator'),
  email: z.string().optional().describe('Email of the collaborator'),
  editorUrl: z
    .string()
    .optional()
    .describe('Shareable editor URL (can be embedded with ?embedded=yes)')
});

export let manageCollaborators = SlateTool.create(spec, {
  name: 'Manage Template Collaborators',
  key: 'manage_collaborators',
  description: `Add, list, or remove collaborators on a contract template. Collaborators can edit the template via a shareable editor URL that can be embedded in an iframe.`,
  instructions: [
    'For "add", provide a collaborator name. An editor URL will be returned.',
    'For "list", only the templateId is needed.',
    'For "remove", provide the collaboratorId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template'),
      action: z.enum(['add', 'list', 'remove']).describe('Action to perform'),
      collaboratorName: z
        .string()
        .optional()
        .describe('Name of the collaborator to add (required for "add")'),
      collaboratorId: z
        .string()
        .optional()
        .describe('ID of the collaborator to remove (required for "remove")')
    })
  )
  .output(
    z.object({
      status: z.string().optional().describe('Status of the operation'),
      collaborators: z
        .array(collaboratorSchema)
        .optional()
        .describe('List of collaborators (for list and add actions)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { templateId, action, collaboratorName, collaboratorId } = ctx.input;

    let message: string;
    let output: any;

    switch (action) {
      case 'add': {
        if (!collaboratorName) {
          throw new Error('collaboratorName is required when adding a collaborator');
        }
        ctx.progress('Adding collaborator...');
        let result = await client.addCollaborator(templateId, collaboratorName);
        let collabs = result?.data || [result];
        let mapped = (Array.isArray(collabs) ? collabs : [collabs]).map((c: any) => ({
          collaboratorId: c.templateCollaboratorId,
          templateId: c.templateId,
          name: c.name,
          email: c.email,
          editorUrl: c.templateCollaboratorEditorUrl
        }));
        output = { collaborators: mapped };
        message = `Collaborator **${collaboratorName}** added to template **${templateId}**.`;
        break;
      }
      case 'list': {
        ctx.progress('Listing collaborators...');
        let result = await client.listCollaborators(templateId);
        let collabs = result?.data || result || [];
        let mapped = (Array.isArray(collabs) ? collabs : [collabs]).map((c: any) => ({
          collaboratorId: c.templateCollaboratorId,
          templateId: c.templateId,
          name: c.name,
          email: c.email,
          editorUrl: c.templateCollaboratorEditorUrl
        }));
        output = { collaborators: mapped };
        message = `Found **${mapped.length}** collaborator(s) on template **${templateId}**.`;
        break;
      }
      case 'remove': {
        if (!collaboratorId) {
          throw new Error('collaboratorId is required when removing a collaborator');
        }
        ctx.progress('Removing collaborator...');
        let result = await client.removeCollaborator(templateId, collaboratorId);
        output = { status: result?.status || 'queued' };
        message = `Collaborator **${collaboratorId}** removed from template **${templateId}**.`;
        break;
      }
    }

    return { output, message };
  })
  .build();

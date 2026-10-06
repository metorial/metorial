import { createApiServiceError } from 'slates';
import { Client } from './client';

export let createClient = (ctx: {
  auth: { token: string; linkname: string };
  config: Record<string, unknown>;
}) => {
  let domain = (
    ctx.auth.linkname || (typeof ctx.config.domain === 'string' ? ctx.config.domain : '')
  )
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\.salesmate\.io\/?$/, '');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(domain)) {
    throw createApiServiceError(
      'Enter your Salesmate subdomain or hostname in the API key connection.',
      {
        reason: 'salesmate_invalid_domain'
      }
    );
  }
  return new Client({ token: ctx.auth.token, domain });
};

export let resolveNoteModuleId = (input: { moduleId?: number; linkedModule?: string }) => {
  if (input.moduleId !== undefined) return input.moduleId;
  let modules: Record<string, number> = {
    contact: 1,
    task: 2,
    activity: 2,
    deal: 4,
    company: 5,
    product: 6
  };
  let moduleId = modules[input.linkedModule?.toLowerCase() ?? ''];
  if (!moduleId) {
    throw createApiServiceError(
      'Provide linkedModule (Contact, Company, Deal, Task, or Product), or call get_module_id and provide moduleId.',
      {
        reason: 'salesmate_missing_note_module'
      }
    );
  }
  return moduleId;
};

export let requireNoteRecordId = (recordId?: number) => {
  if (recordId === undefined) {
    throw createApiServiceError(
      'Provide linkedRecordId for the record containing the note. Call list_notes to find notes for a record.',
      {
        reason: 'salesmate_missing_note_record'
      }
    );
  }
  return recordId;
};

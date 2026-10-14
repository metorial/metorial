import { createApiServiceError } from 'slates';
import type { DovetailContact, DovetailExport, DovetailField } from './types';

export let mapFields = (fields?: DovetailField[]) =>
  fields?.map(field => ({
    label: field.label,
    value:
      field.value === null || typeof field.value === 'string'
        ? field.value
        : JSON.stringify(field.value)
  }));

export let mapContact = (contact: DovetailContact) => {
  let email =
    contact.email ??
    contact.fields?.find(
      field => field.type === 'EMAIL' || field.label.toLowerCase() === 'email'
    )?.value;
  return {
    contactId: contact.id,
    name: contact.name ?? '',
    email: typeof email === 'string' ? email : undefined,
    createdAt: contact.created_at,
    updatedAt: contact.updated_at
  };
};

export let exportResponse = (data: DovetailExport, format: 'html' | 'markdown') => {
  let content = format === 'html' ? data.content_html : data.content_markdown;
  if (typeof content !== 'string')
    throw createApiServiceError(
      `Dovetail did not return the requested ${format} export content.`
    );
  return new Response(content, {
    headers: {
      'content-type':
        format === 'html' ? 'text/html; charset=utf-8' : 'text/markdown; charset=utf-8'
    }
  });
};

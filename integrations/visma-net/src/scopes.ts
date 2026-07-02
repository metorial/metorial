import { allOf } from 'slates';

export let vismaNetScopes = {
  read: 'vismanet_erp_interactive_api:read',
  create: 'vismanet_erp_interactive_api:create',
  update: 'vismanet_erp_interactive_api:update',
  delete: 'vismanet_erp_interactive_api:delete',
  uiExtension: 'vismanet_erp_interactive_api:ui-extension'
} as const;

export let vismaNetActionScopes = {
  read: allOf(vismaNetScopes.read)
} as const;

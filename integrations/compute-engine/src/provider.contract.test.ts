import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { computeEngineActionScopes, computeEngineScopes } from './scopes';

const toolContracts = [
  { id: 'create_instance', readOnly: false, destructive: false },
  { id: 'delete_instance', readOnly: false, destructive: true },
  { id: 'start_instance', readOnly: false, destructive: false },
  { id: 'stop_instance', readOnly: false, destructive: true },
  { id: 'reset_instance', readOnly: false, destructive: true },
  { id: 'set_instance_machine_type', readOnly: false, destructive: false },
  { id: 'get_instance_basic_info', readOnly: true, destructive: false },
  { id: 'list_instances', readOnly: true, destructive: false },
  { id: 'list_instance_attached_disks', readOnly: true, destructive: false },
  { id: 'get_disk_basic_info', readOnly: true, destructive: false },
  { id: 'get_disk_performance_config', readOnly: true, destructive: false },
  { id: 'list_disks', readOnly: true, destructive: false },
  { id: 'list_snapshots', readOnly: true, destructive: false },
  { id: 'list_images', readOnly: true, destructive: false },
  { id: 'list_machine_types', readOnly: true, destructive: false },
  { id: 'list_accelerator_types', readOnly: true, destructive: false },
  {
    id: 'get_instance_group_manager_basic_info',
    readOnly: true,
    destructive: false
  },
  { id: 'list_instance_group_managers', readOnly: true, destructive: false },
  { id: 'list_managed_instances', readOnly: true, destructive: false },
  { id: 'get_instance_template_basic_info', readOnly: true, destructive: false },
  { id: 'get_instance_template_properties', readOnly: true, destructive: false },
  { id: 'list_instance_templates', readOnly: true, destructive: false },
  { id: 'get_reservation_basic_info', readOnly: true, destructive: false },
  { id: 'get_reservation_details', readOnly: true, destructive: false },
  { id: 'list_reservations', readOnly: true, destructive: false },
  { id: 'get_commitment_basic_info', readOnly: true, destructive: false },
  { id: 'list_commitments', readOnly: true, destructive: false },
  { id: 'list_commitment_reservations', readOnly: true, destructive: false },
  { id: 'get_zone_operation', readOnly: true, destructive: false }
] as const;

const toolIds = toolContracts.map(tool => tool.id);

describe('compute-engine provider contract', () => {
  it('exposes the exact official 29-tool surface with tags and per-tool scopes', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'compute-engine',
        name: 'Google Compute Engine',
        description:
          'Connect a Google Cloud project to the Compute Engine API for virtual machine and infrastructure workflows.'
      },
      toolIds: [...toolIds],
      triggerIds: [],
      authMethodIds: ['google_oauth', 'service_account'],
      tools: [...toolContracts]
    });

    expect(contract.actions).toHaveLength(29);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([
      'projectId',
      'defaultZone',
      'defaultRegion'
    ]);
    expect(contract.configSchema.required).toEqual(['projectId']);

    let expectedScopes = {
      create_instance: computeEngineActionScopes.write,
      delete_instance: computeEngineActionScopes.write,
      start_instance: computeEngineActionScopes.write,
      stop_instance: computeEngineActionScopes.write,
      reset_instance: computeEngineActionScopes.write,
      set_instance_machine_type: computeEngineActionScopes.write,
      get_instance_basic_info: computeEngineActionScopes.read,
      list_instances: computeEngineActionScopes.read,
      list_instance_attached_disks: computeEngineActionScopes.read,
      get_disk_basic_info: computeEngineActionScopes.read,
      get_disk_performance_config: computeEngineActionScopes.read,
      list_disks: computeEngineActionScopes.read,
      list_snapshots: computeEngineActionScopes.read,
      list_images: computeEngineActionScopes.read,
      list_machine_types: computeEngineActionScopes.read,
      list_accelerator_types: computeEngineActionScopes.read,
      get_instance_group_manager_basic_info: computeEngineActionScopes.read,
      list_instance_group_managers: computeEngineActionScopes.read,
      list_managed_instances: computeEngineActionScopes.read,
      get_instance_template_basic_info: computeEngineActionScopes.read,
      get_instance_template_properties: computeEngineActionScopes.read,
      list_instance_templates: computeEngineActionScopes.read,
      get_reservation_basic_info: computeEngineActionScopes.read,
      get_reservation_details: computeEngineActionScopes.read,
      list_reservations: computeEngineActionScopes.read,
      get_commitment_basic_info: computeEngineActionScopes.read,
      list_commitments: computeEngineActionScopes.read,
      list_commitment_reservations: computeEngineActionScopes.read,
      get_zone_operation: computeEngineActionScopes.read
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    for (let toolId of toolIds) {
      expect(`compute-engine-${toolId}`.length).toBeLessThan(60);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
    expect(oauth.authenticationMethod.scopes).toEqual([
      {
        title: 'Compute Engine Full Access',
        description: 'View and manage Google Compute Engine resources.',
        id: computeEngineScopes.compute,
        defaultChecked: true
      },
      {
        title: 'Compute Engine Read Only',
        description: 'View Google Compute Engine resources.',
        id: computeEngineScopes.computeReadonly,
        defaultChecked: undefined
      },
      {
        title: 'Cloud Platform Full Access',
        description: 'View and manage resources across Google Cloud services.',
        id: computeEngineScopes.cloudPlatform,
        defaultChecked: undefined
      },
      {
        title: 'Google Account Profile',
        description: 'View your basic Google Account profile for connection identity.',
        id: computeEngineScopes.userinfoProfile,
        defaultChecked: true
      },
      {
        title: 'Google Account Email',
        description: 'View your Google Account email address for connection identity.',
        id: computeEngineScopes.userinfoEmail,
        defaultChecked: true
      }
    ]);

    let serviceAccount = await client.getAuthMethod('service_account');
    expect(serviceAccount.authenticationMethod.type).toBe('auth.custom');
    expect(serviceAccount.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(
      true
    );
    expect(serviceAccount.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);
  });

  it('defines the official read and write scope clauses', () => {
    expect(computeEngineActionScopes.read).toEqual({
      AND: [
        {
          OR: [
            computeEngineScopes.computeReadonly,
            computeEngineScopes.compute,
            computeEngineScopes.cloudPlatform
          ]
        }
      ]
    });
    expect(computeEngineActionScopes.write).toEqual({
      AND: [{ OR: [computeEngineScopes.compute, computeEngineScopes.cloudPlatform] }]
    });
  });
});

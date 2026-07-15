import { expectMcpCompatibleToolSchema } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComputeEngineClient } from './lib/client';
import { computeEngineActionScopes } from './scopes';
import {
  getCommitmentBasicInfo,
  listCommitmentReservations,
  listCommitments
} from './tools/commitments';
import {
  getInstanceGroupManagerBasicInfo,
  listInstanceGroupManagers,
  listManagedInstances
} from './tools/instance-groups';
import {
  getInstanceTemplateBasicInfo,
  getInstanceTemplateProperties,
  listInstanceTemplates
} from './tools/instance-templates';
import { getZoneOperation } from './tools/operations';
import {
  getReservationBasicInfo,
  getReservationDetails,
  listReservations
} from './tools/reservations';

let stageBTools = [
  getInstanceGroupManagerBasicInfo,
  listInstanceGroupManagers,
  listManagedInstances,
  getInstanceTemplateBasicInfo,
  getInstanceTemplateProperties,
  listInstanceTemplates,
  getReservationBasicInfo,
  getReservationDetails,
  listReservations,
  getCommitmentBasicInfo,
  listCommitments,
  listCommitmentReservations,
  getZoneOperation
] as const;

let createContext = <T extends Record<string, unknown>>(input: T) =>
  ({
    input,
    auth: { token: 'test-token' },
    config: {
      projectId: 'test-project',
      defaultZone: 'us-central1-a',
      defaultRegion: 'us-central1'
    },
    progress: vi.fn()
  }) as any;

let requestSpy = vi.spyOn(ComputeEngineClient.prototype, 'request');

beforeEach(() => {
  requestSpy.mockReset();
});

describe('compute-engine Stage B tool family', () => {
  it('exports exactly the enumerated keys with read scopes and compatible schemas', () => {
    expect(stageBTools.map(tool => tool.key)).toEqual([
      'get_instance_group_manager_basic_info',
      'list_instance_group_managers',
      'list_managed_instances',
      'get_instance_template_basic_info',
      'get_instance_template_properties',
      'list_instance_templates',
      'get_reservation_basic_info',
      'get_reservation_details',
      'list_reservations',
      'get_commitment_basic_info',
      'list_commitments',
      'list_commitment_reservations',
      'get_zone_operation'
    ]);

    for (let tool of stageBTools) {
      expectMcpCompatibleToolSchema(tool);
      expect(`compute-engine-${tool.key}`.length).toBeLessThan(60);
      expect(tool.scopes).toEqual(computeEngineActionScopes.read);
      expect(tool.tags?.readOnly).toBe(true);
    }
  });

  it('uses zonal instanceGroupManagers endpoints, projections, and pagination', async () => {
    requestSpy
      .mockResolvedValueOnce({
        name: 'mig-1',
        id: '100',
        creationTimestamp: '2026-07-14T10:00:00Z',
        instanceTemplate: 'global/instanceTemplates/template-1',
        baseInstanceName: 'worker',
        targetSize: 3,
        targetStoppedSize: 0,
        targetSuspendedSize: 0,
        listManagedInstancesResults: 'PAGINATED',
        status: { isStable: true }
      })
      .mockResolvedValueOnce({ items: [], nextPageToken: 'mig-page-2' })
      .mockResolvedValueOnce({
        managedInstances: [
          {
            name: 'worker-abcd',
            instance: 'zones/us-central1-a/instances/worker-abcd',
            id: '101',
            instanceStatus: 'RUNNING',
            currentAction: 'NONE'
          }
        ],
        nextPageToken: 'managed-page-2'
      });

    let basic = await getInstanceGroupManagerBasicInfo.handleInvocation(
      createContext({ name: 'mig-1' })
    );
    let list = await listInstanceGroupManagers.handleInvocation(
      createContext({ pageSize: 25, pageToken: 'mig-page-1', filter: "name eq '^mig-.*'" })
    );
    let managed = await listManagedInstances.handleInvocation(
      createContext({
        name: 'mig-1',
        pageSize: 50,
        pageToken: 'managed-page-1',
        filter: 'instanceStatus = RUNNING'
      })
    );

    expect(basic.output).toMatchObject({
      name: 'mig-1',
      createTime: '2026-07-14T10:00:00Z',
      baseInstanceName: 'worker',
      listManagedInstancesResults: 'PAGINATED',
      status: { isStable: true }
    });
    expect(list.output.nextPageToken).toBe('mig-page-2');
    expect(managed.output).toMatchObject({
      managedInstances: [{ name: 'worker-abcd', currentAction: 'NONE' }],
      nextPageToken: 'managed-page-2'
    });

    expect(requestSpy.mock.calls).toEqual([
      [
        'get instance group manager basic info',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/instanceGroupManagers/mig-1',
          params: {
            fields:
              'name,id,creationTimestamp,instanceTemplate,baseInstanceName,targetSize,targetStoppedSize,targetSuspendedSize,listManagedInstancesResults,status'
          }
        }
      ],
      [
        'list instance group managers',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/instanceGroupManagers',
          params: {
            filter: "name eq '^mig-.*'",
            maxResults: 25,
            pageToken: 'mig-page-1',
            fields:
              'items(name,id,creationTimestamp,instanceTemplate,baseInstanceName,targetSize,targetStoppedSize,targetSuspendedSize,listManagedInstancesResults,status),nextPageToken'
          }
        }
      ],
      [
        'list managed instances',
        {
          method: 'post',
          path: 'projects/test-project/zones/us-central1-a/instanceGroupManagers/mig-1/listManagedInstances',
          params: {
            filter: 'instanceStatus = RUNNING',
            maxResults: 50,
            pageToken: 'managed-page-1',
            fields:
              'managedInstances(name,instance,id,instanceStatus,version(name,instanceTemplate),currentAction),nextPageToken'
          }
        }
      ]
    ]);
  });

  it('uses the global instanceTemplates collection and distinct basic/property projections', async () => {
    requestSpy
      .mockResolvedValueOnce({
        name: 'template-1',
        id: '200',
        description: 'Worker template',
        properties: { machineType: 'n2-standard-4' },
        creationTimestamp: '2026-07-14T11:00:00Z'
      })
      .mockResolvedValueOnce({
        properties: {
          machineType: 'n2-standard-4',
          disks: [{ boot: true }],
          networkInterfaces: [{ network: 'global/networks/default' }],
          metadata: { items: [{ key: 'role', value: 'worker' }] },
          localSsdEncryptionMode: 'STANDARD_ENCRYPTION'
        }
      })
      .mockResolvedValueOnce({ items: [], nextPageToken: 'template-page-2' });

    let basic = await getInstanceTemplateBasicInfo.handleInvocation(
      createContext({ name: 'template-1' })
    );
    let properties = await getInstanceTemplateProperties.handleInvocation(
      createContext({ name: 'template-1' })
    );
    let list = await listInstanceTemplates.handleInvocation(
      createContext({
        pageSize: 20,
        pageToken: 'template-page-1',
        filter: "name eq '^web-.*'"
      })
    );

    expect(basic.output).toMatchObject({
      name: 'template-1',
      machineType: 'n2-standard-4',
      createTime: '2026-07-14T11:00:00Z'
    });
    expect(properties.output).toMatchObject({
      machineType: 'n2-standard-4',
      disks: [{ boot: true }],
      localSsdEncryptionMode: 'STANDARD_ENCRYPTION'
    });
    expect(list.output.nextPageToken).toBe('template-page-2');

    expect(requestSpy.mock.calls).toEqual([
      [
        'get instance template basic info',
        {
          method: 'get',
          path: 'projects/test-project/global/instanceTemplates/template-1',
          params: {
            fields: 'name,id,description,properties(machineType),region,creationTimestamp'
          }
        }
      ],
      [
        'get instance template properties',
        {
          method: 'get',
          path: 'projects/test-project/global/instanceTemplates/template-1',
          params: { fields: 'properties' }
        }
      ],
      [
        'list instance templates',
        {
          method: 'get',
          path: 'projects/test-project/global/instanceTemplates',
          params: {
            filter: "name eq '^web-.*'",
            maxResults: 20,
            pageToken: 'template-page-1',
            fields:
              'items(name,id,description,properties(machineType),region,creationTimestamp),nextPageToken'
          }
        }
      ]
    ]);
  });

  it('uses zonal reservation reads with separate basic and detailed projections', async () => {
    requestSpy
      .mockResolvedValueOnce({
        name: 'reservation-1',
        id: '300',
        creationTimestamp: '2026-07-14T12:00:00Z',
        zone: 'zones/us-central1-a',
        status: 'READY',
        commitment: 'regions/us-central1/commitments/commitment-1',
        linkedCommitments: [],
        specificReservationRequired: true
      })
      .mockResolvedValueOnce({
        name: 'reservation-1',
        id: '300',
        status: 'READY',
        specificReservation: {
          instanceProperties: {
            machineType: 'n2-standard-4',
            guestAccelerators: []
          },
          count: '2',
          inUseCount: '1'
        },
        shareSettings: {
          shareType: 'SPECIFIC_PROJECTS',
          projectMap: { 'consumer-project': { projectId: 'consumer-project' } }
        },
        reservationSharingPolicy: { serviceShareType: 'DISALLOW_ALL' }
      })
      .mockResolvedValueOnce({ items: [], nextPageToken: 'reservation-page-2' });

    let basic = await getReservationBasicInfo.handleInvocation(
      createContext({ name: 'reservation-1' })
    );
    let details = await getReservationDetails.handleInvocation(
      createContext({ name: 'reservation-1' })
    );
    let list = await listReservations.handleInvocation(
      createContext({
        pageSize: 30,
        pageToken: 'reservation-page-1',
        filter: 'status = READY'
      })
    );

    expect(basic.output).toMatchObject({
      name: 'reservation-1',
      createTime: '2026-07-14T12:00:00Z',
      status: 'READY'
    });
    expect(details.output).toMatchObject({
      specificReservation: { count: '2', inUseCount: '1' },
      shareSettings: { shareType: 'SPECIFIC_PROJECTS' },
      reservationSharingPolicy: { serviceShareType: 'DISALLOW_ALL' }
    });
    expect(list.output.nextPageToken).toBe('reservation-page-2');

    expect(requestSpy.mock.calls).toEqual([
      [
        'get reservation basic info',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/reservations/reservation-1',
          params: {
            fields:
              'name,id,creationTimestamp,zone,status,commitment,linkedCommitments,specificReservationRequired'
          }
        }
      ],
      [
        'get reservation details',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/reservations/reservation-1',
          params: {
            fields:
              'kind,id,creationTimestamp,selfLink,zone,description,name,commitment,linkedCommitments,specificReservationRequired,status,shareSettings,satisfiesPzs,resourcePolicies,resourceStatus,reservationSharingPolicy,deploymentType,advancedDeploymentControl,enableEmergentMaintenance,protectionTier,schedulingType,confidentialComputeType,earlyAccessMaintenance,specificReservation,aggregateReservation,deleteAtTime,deleteAfterDuration'
          }
        }
      ],
      [
        'list reservations',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/reservations',
          params: {
            filter: 'status = READY',
            maxResults: 30,
            pageToken: 'reservation-page-1',
            fields:
              'items(name,id,creationTimestamp,zone,status,commitment,linkedCommitments,specificReservationRequired),nextPageToken'
          }
        }
      ]
    ]);
  });

  it('uses regional commitment endpoints and reads attached reservations from the commitment', async () => {
    requestSpy
      .mockResolvedValueOnce({
        name: 'commitment-1',
        id: '400',
        status: 'ACTIVE',
        statusMessage: 'Commitment is active',
        plan: 'TWELVE_MONTH',
        category: 'MACHINE',
        type: 'GENERAL_PURPOSE_N2',
        region: 'regions/us-central1',
        selfLink:
          'https://compute.googleapis.com/compute/v1/projects/test-project/regions/us-central1/commitments/commitment-1',
        creationTimestamp: '2026-07-14T13:00:00Z',
        startTimestamp: '2026-07-15T00:00:00Z',
        endTimestamp: '2027-07-15T00:00:00Z',
        resources: [{ type: 'VCPU', amount: '4' }]
      })
      .mockResolvedValueOnce({ items: [], nextPageToken: 'commitment-page-2' })
      .mockResolvedValueOnce({
        reservations: [{ name: 'reservation-1', id: '300', status: 'READY' }]
      });

    let basic = await getCommitmentBasicInfo.handleInvocation(
      createContext({ name: 'commitment-1' })
    );
    let list = await listCommitments.handleInvocation(
      createContext({
        pageSize: 15,
        pageToken: 'commitment-page-1',
        filter: 'status = ACTIVE'
      })
    );
    let reservations = await listCommitmentReservations.handleInvocation(
      createContext({ name: 'commitment-1' })
    );

    expect(basic.output).toMatchObject({
      name: 'commitment-1',
      createTime: '2026-07-14T13:00:00Z',
      category: 'MACHINE',
      resources: [{ type: 'VCPU', amount: '4' }]
    });
    expect(list.output.nextPageToken).toBe('commitment-page-2');
    expect(reservations.output.reservations).toEqual([
      { name: 'reservation-1', id: '300', status: 'READY' }
    ]);

    expect(requestSpy.mock.calls).toEqual([
      [
        'get commitment basic info',
        {
          method: 'get',
          path: 'projects/test-project/regions/us-central1/commitments/commitment-1',
          params: {
            fields:
              'name,id,status,statusMessage,plan,category,type,region,selfLink,creationTimestamp,startTimestamp,endTimestamp,resources(type,amount,acceleratorType)'
          }
        }
      ],
      [
        'list commitments',
        {
          method: 'get',
          path: 'projects/test-project/regions/us-central1/commitments',
          params: {
            filter: 'status = ACTIVE',
            maxResults: 15,
            pageToken: 'commitment-page-1',
            fields:
              'items(name,id,status,statusMessage,plan,category,type,region,selfLink,creationTimestamp,startTimestamp,endTimestamp,resources(type,amount,acceleratorType)),nextPageToken'
          }
        }
      ],
      [
        'list commitment reservations',
        {
          method: 'get',
          path: 'projects/test-project/regions/us-central1/commitments/commitment-1',
          params: { fields: 'reservations' }
        }
      ]
    ]);
  });

  it('gets a projected zonal operation and maps its request and lifecycle timestamps', async () => {
    requestSpy.mockResolvedValueOnce({
      id: '500',
      name: 'operation-1',
      status: 'DONE',
      zone: 'zones/us-central1-a',
      operationType: 'insert',
      targetLink: 'projects/test-project/zones/us-central1-a/instances/vm-1',
      targetId: '501',
      progress: 100,
      insertTime: '2026-07-14T14:00:00Z',
      startTime: '2026-07-14T14:00:01Z',
      endTime: '2026-07-14T14:00:05Z',
      warnings: [{ code: 'NO_RESULTS_ON_PAGE', message: 'No results' }]
    });

    let result = await getZoneOperation.handleInvocation(
      createContext({ name: 'operation-1' })
    );

    expect(result.output).toMatchObject({
      id: '500',
      name: 'operation-1',
      status: 'DONE',
      operationType: 'insert',
      progress: 100,
      insertTime: '2026-07-14T14:00:00Z',
      createTime: '2026-07-14T14:00:00Z'
    });
    expect(requestSpy).toHaveBeenCalledWith('get zone operation', {
      method: 'get',
      path: 'projects/test-project/zones/us-central1-a/operations/operation-1',
      params: {
        fields:
          'id,name,zone,status,statusMessage,operationType,targetLink,targetId,progress,insertTime,startTime,endTime,creationTimestamp,error,warnings,httpErrorMessage,httpErrorStatusCode'
      }
    });
  });
});

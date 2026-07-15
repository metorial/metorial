import { expectMcpCompatibleToolSchema } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComputeEngineClient } from './lib/client';
import { computeEngineActionScopes } from './scopes';
import {
  listAcceleratorTypes,
  listImages,
  listMachineTypes,
  PUBLIC_IMAGE_PROJECTS
} from './tools/catalogs';
import {
  getDiskBasicInfo,
  getDiskPerformanceConfig,
  listDisks,
  listSnapshots
} from './tools/disks';
import {
  createInstance,
  deleteInstance,
  getInstanceBasicInfo,
  listInstanceAttachedDisks,
  listInstances,
  resetInstance,
  setInstanceMachineType,
  startInstance,
  stopInstance
} from './tools/instances';

let stageATools = [
  createInstance,
  deleteInstance,
  startInstance,
  stopInstance,
  resetInstance,
  setInstanceMachineType,
  getInstanceBasicInfo,
  listInstances,
  listInstanceAttachedDisks,
  getDiskBasicInfo,
  getDiskPerformanceConfig,
  listDisks,
  listSnapshots,
  listImages,
  listMachineTypes,
  listAcceleratorTypes
] as const;

let writeTools = [
  createInstance,
  deleteInstance,
  startInstance,
  stopInstance,
  resetInstance,
  setInstanceMachineType
] as const;

let readTools = [
  getInstanceBasicInfo,
  listInstances,
  listInstanceAttachedDisks,
  getDiskBasicInfo,
  getDiskPerformanceConfig,
  listDisks,
  listSnapshots,
  listImages,
  listMachineTypes,
  listAcceleratorTypes
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

describe('compute-engine Stage A tool family', () => {
  it('exports exactly the enumerated official keys with compatible schemas and IDs', () => {
    expect(stageATools).toHaveLength(16);
    expect(stageATools.map(tool => tool.key)).toEqual([
      'create_instance',
      'delete_instance',
      'start_instance',
      'stop_instance',
      'reset_instance',
      'set_instance_machine_type',
      'get_instance_basic_info',
      'list_instances',
      'list_instance_attached_disks',
      'get_disk_basic_info',
      'get_disk_performance_config',
      'list_disks',
      'list_snapshots',
      'list_images',
      'list_machine_types',
      'list_accelerator_types'
    ]);

    for (let tool of stageATools) {
      expectMcpCompatibleToolSchema(tool);
      expect(`compute-engine-${tool.key}`.length).toBeLessThan(60);
    }
  });

  it('applies write and read scopes plus the required destructive tags', () => {
    for (let tool of writeTools) {
      expect(tool.scopes).toEqual(computeEngineActionScopes.write);
      expect(tool.tags?.readOnly).toBe(false);
    }
    for (let tool of readTools) {
      expect(tool.scopes).toEqual(computeEngineActionScopes.read);
      expect(tool.tags?.readOnly).toBe(true);
    }

    expect(stageATools.filter(tool => tool.tags?.destructive).map(tool => tool.key)).toEqual([
      'delete_instance',
      'stop_instance',
      'reset_instance'
    ]);
  });

  it('creates the documented default VM and forces TERMINATE for GPUs', async () => {
    requestSpy.mockResolvedValueOnce({ name: 'operation-create', status: 'PENDING' });

    let result = await createInstance.handleInvocation(
      createContext({
        name: 'gpu-vm',
        guestAccelerators: [{ acceleratorType: 'nvidia-tesla-t4', acceleratorCount: 1 }],
        maintenancePolicy: 'MIGRATE'
      })
    );

    expect(requestSpy).toHaveBeenCalledWith('create instance', {
      method: 'post',
      path: 'projects/test-project/zones/us-central1-a/instances',
      params: { fields: 'name,status' },
      body: {
        name: 'gpu-vm',
        machineType: 'zones/us-central1-a/machineTypes/e2-medium',
        disks: [
          {
            boot: true,
            autoDelete: true,
            initializeParams: {
              sourceImage: 'projects/debian-cloud/global/images/family/debian-12'
            }
          }
        ],
        networkInterfaces: [{ network: 'global/networks/default' }],
        guestAccelerators: [
          {
            acceleratorType: 'zones/us-central1-a/acceleratorTypes/nvidia-tesla-t4',
            acceleratorCount: 1
          }
        ],
        scheduling: { onHostMaintenance: 'TERMINATE' }
      }
    });
    expect(result.output).toEqual({
      operationName: 'operation-create',
      status: 'PENDING'
    });
    expect(result.message).toContain('get_zone_operation');
  });

  it('uses exact lifecycle and machine-type endpoints and operation projections', async () => {
    requestSpy.mockResolvedValue({ name: 'operation-1', status: 'RUNNING' });

    await deleteInstance.handleInvocation(
      createContext({ zone: 'europe-west1-b', name: 'vm-1' })
    );
    await startInstance.handleInvocation(createContext({ name: 'vm-1' }));
    await stopInstance.handleInvocation(createContext({ name: 'vm-1' }));
    await resetInstance.handleInvocation(createContext({ name: 'vm-1' }));
    await setInstanceMachineType.handleInvocation(
      createContext({ name: 'vm-1', machineType: 'n2-standard-4' })
    );

    expect(requestSpy.mock.calls).toEqual([
      [
        'delete instance',
        {
          method: 'delete',
          path: 'projects/test-project/zones/europe-west1-b/instances/vm-1',
          params: { fields: 'name,status' }
        }
      ],
      [
        'start instance',
        {
          method: 'post',
          path: 'projects/test-project/zones/us-central1-a/instances/vm-1/start',
          params: { fields: 'name,status' }
        }
      ],
      [
        'stop instance',
        {
          method: 'post',
          path: 'projects/test-project/zones/us-central1-a/instances/vm-1/stop',
          params: { fields: 'name,status' }
        }
      ],
      [
        'reset instance',
        {
          method: 'post',
          path: 'projects/test-project/zones/us-central1-a/instances/vm-1/reset',
          params: { fields: 'name,status' }
        }
      ],
      [
        'set instance machine type',
        {
          method: 'post',
          path: 'projects/test-project/zones/us-central1-a/instances/vm-1/setMachineType',
          params: { fields: 'name,status' },
          body: {
            machineType: 'zones/us-central1-a/machineTypes/n2-standard-4'
          }
        }
      ]
    ]);
  });

  it('projects and maps instance reads through instances.get and instances.list', async () => {
    requestSpy
      .mockResolvedValueOnce({
        name: 'vm-1',
        id: '100',
        status: 'RUNNING',
        machineType: 'zones/us-central1-a/machineTypes/e2-medium',
        creationTimestamp: '2026-07-14T10:00:00Z',
        guestAccelerators: []
      })
      .mockResolvedValueOnce({
        items: [
          {
            name: 'vm-1',
            id: '100',
            status: 'RUNNING',
            machineType: 'zones/us-central1-a/machineTypes/e2-medium',
            creationTimestamp: '2026-07-14T10:00:00Z'
          }
        ],
        nextPageToken: 'instance-page-2'
      })
      .mockResolvedValueOnce({
        disks: [
          {
            type: 'PERSISTENT',
            mode: 'READ_WRITE',
            source: 'projects/test-project/zones/us-central1-a/disks/vm-1',
            deviceName: 'persistent-disk-0',
            boot: true
          }
        ]
      });

    let basic = await getInstanceBasicInfo.handleInvocation(createContext({ name: 'vm-1' }));
    let list = await listInstances.handleInvocation(
      createContext({
        pageSize: 25,
        pageToken: 'instance-page-1',
        filter: 'status = RUNNING'
      })
    );
    let disks = await listInstanceAttachedDisks.handleInvocation(
      createContext({ name: 'vm-1' })
    );

    expect(basic.output).toMatchObject({
      name: 'vm-1',
      createTime: '2026-07-14T10:00:00Z'
    });
    expect(list.output).toMatchObject({
      instances: [{ name: 'vm-1', id: '100' }],
      nextPageToken: 'instance-page-2'
    });
    expect(disks.output.attachedDisks).toHaveLength(1);

    expect(requestSpy.mock.calls).toEqual([
      [
        'get instance basic info',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/instances/vm-1',
          params: {
            fields:
              'name,id,status,machineType,creationTimestamp,guestAccelerators(acceleratorType,acceleratorCount)'
          }
        }
      ],
      [
        'list instances',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/instances',
          params: {
            filter: 'status = RUNNING',
            maxResults: 25,
            pageToken: 'instance-page-1',
            fields:
              'items(name,id,status,machineType,creationTimestamp,guestAccelerators(acceleratorType,acceleratorCount)),nextPageToken'
          }
        }
      ],
      [
        'list instance attached disks',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/instances/vm-1',
          params: { fields: 'disks' }
        }
      ]
    ]);
  });

  it('uses the distinct disk projections and the global snapshots collection', async () => {
    requestSpy
      .mockResolvedValueOnce({
        name: 'disk-1',
        id: '200',
        creationTimestamp: '2026-07-14T10:00:00Z',
        sizeGb: '100',
        type: 'zones/us-central1-a/diskTypes/pd-balanced',
        status: 'READY'
      })
      .mockResolvedValueOnce({
        type: 'zones/us-central1-a/diskTypes/hyperdisk-balanced',
        sizeGb: '500',
        provisionedIops: '6000',
        provisionedThroughput: '250',
        physicalBlockSizeBytes: '4096',
        accessMode: 'READ_WRITE_SINGLE'
      })
      .mockResolvedValueOnce({ items: [], nextPageToken: 'disk-page-2' })
      .mockResolvedValueOnce({ items: [], nextPageToken: 'snapshot-page-2' });

    await getDiskBasicInfo.handleInvocation(createContext({ name: 'disk-1' }));
    await getDiskPerformanceConfig.handleInvocation(createContext({ name: 'disk-1' }));
    await listDisks.handleInvocation(
      createContext({ pageSize: 20, filter: 'status = READY' })
    );
    await listSnapshots.handleInvocation(
      createContext({
        pageSize: 10,
        pageToken: 'snapshot-page-1',
        filter: "name eq '^nightly-.*'"
      })
    );

    expect(requestSpy.mock.calls).toEqual([
      [
        'get disk basic info',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/disks/disk-1',
          params: {
            fields:
              'name,id,description,creationTimestamp,sizeGb,type,status,lastAttachTimestamp,lastDetachTimestamp'
          }
        }
      ],
      [
        'get disk performance config',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/disks/disk-1',
          params: {
            fields:
              'type,sizeGb,provisionedIops,provisionedThroughput,physicalBlockSizeBytes,storagePool,accessMode'
          }
        }
      ],
      [
        'list disks',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/disks',
          params: {
            filter: 'status = READY',
            maxResults: 20,
            fields:
              'items(name,id,description,creationTimestamp,sizeGb,type,status,lastAttachTimestamp,lastDetachTimestamp),nextPageToken'
          }
        }
      ],
      [
        'list snapshots',
        {
          method: 'get',
          path: 'projects/test-project/global/snapshots',
          params: {
            filter: "name eq '^nightly-.*'",
            maxResults: 10,
            pageToken: 'snapshot-page-1',
            fields:
              'items(name,id,status,creationTimestamp,diskSizeGb,storageBytes,sourceDisk,sourceDiskId),nextPageToken'
          }
        }
      ]
    ]);
  });

  it('lists an explicit image project and single filtered catalog pages', async () => {
    requestSpy
      .mockResolvedValueOnce({
        items: [
          {
            name: 'debian-12-bookworm',
            id: '300',
            status: 'READY',
            family: 'debian-12',
            creationTimestamp: '2026-07-14T10:00:00Z'
          }
        ],
        nextPageToken: 'image-page-2'
      })
      .mockResolvedValueOnce({
        items: [{ id: '400', name: 'e2-medium' }],
        nextPageToken: 'machine-page-2'
      })
      .mockResolvedValueOnce({
        items: [{ id: '500', name: 'nvidia-tesla-t4' }],
        nextPageToken: 'accelerator-page-2'
      });

    let images = await listImages.handleInvocation(
      createContext({
        imageProject: 'debian-cloud',
        pageSize: 5,
        pageToken: 'image-page-1',
        filter: "family eq 'debian-12'"
      })
    );
    let machineTypes = await listMachineTypes.handleInvocation(
      createContext({ pageSize: 40, pageToken: 'machine-page-1', filter: 'guestCpus > 2' })
    );
    let acceleratorTypes = await listAcceleratorTypes.handleInvocation(
      createContext({
        pageSize: 10,
        pageToken: 'accelerator-page-1',
        filter: "name eq '^nvidia-.*'"
      })
    );

    expect(images.output).toEqual({
      images: [
        {
          name: 'debian-12-bookworm',
          id: '300',
          status: 'READY',
          family: 'debian-12',
          createTime: '2026-07-14T10:00:00Z',
          sourceProject: 'debian-cloud'
        }
      ],
      nextPageToken: 'image-page-2'
    });
    expect(
      machineTypes.output.machineTypes.map((machineType: { name: string }) => machineType.name)
    ).toEqual(['e2-medium']);
    expect(machineTypes.output.nextPageToken).toBe('machine-page-2');
    expect(
      acceleratorTypes.output.acceleratorTypes.map(
        (acceleratorType: { name: string }) => acceleratorType.name
      )
    ).toEqual(['nvidia-tesla-t4']);
    expect(acceleratorTypes.output.nextPageToken).toBe('accelerator-page-2');
    expect(requestSpy.mock.calls).toEqual([
      [
        'list images',
        {
          method: 'get',
          path: 'projects/debian-cloud/global/images',
          params: {
            filter: "family eq 'debian-12'",
            maxResults: 5,
            pageToken: 'image-page-1',
            fields: 'items(name,id,status,family,creationTimestamp),nextPageToken'
          }
        }
      ],
      [
        'list machine types',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/machineTypes',
          params: {
            filter: 'guestCpus > 2',
            maxResults: 40,
            pageToken: 'machine-page-1',
            fields:
              'items(kind,id,creationTimestamp,name,description,guestCpus,memoryMb,imageSpaceGb,maximumPersistentDisks,maximumPersistentDisksSizeGb,deprecated,zone,selfLink,isSharedCpu,accelerators,architecture,bundledLocalSsds),nextPageToken'
          }
        }
      ],
      [
        'list accelerator types',
        {
          method: 'get',
          path: 'projects/test-project/zones/us-central1-a/acceleratorTypes',
          params: {
            filter: "name eq '^nvidia-.*'",
            maxResults: 10,
            pageToken: 'accelerator-page-1',
            fields:
              'items(kind,id,creationTimestamp,name,description,deprecated,zone,selfLink,maximumCardsPerInstance),nextPageToken'
          }
        }
      ]
    ]);
  });

  it('aggregates the configured project and public image projects when imageProject is omitted', async () => {
    requestSpy.mockImplementation(async (_operation, request) => {
      let imageProject = (request as { path: string }).path.split('/')[1];
      return {
        items: [
          {
            name: `${imageProject}-image`,
            id: '300',
            status: 'READY',
            creationTimestamp: '2026-07-14T10:00:00Z'
          }
        ]
      };
    });

    let expectedProjects = ['test-project', ...PUBLIC_IMAGE_PROJECTS];
    let result = await listImages.handleInvocation(createContext({ pageSize: 3 }));

    expect(requestSpy).toHaveBeenCalledTimes(expectedProjects.length);
    expect(
      requestSpy.mock.calls.map(call => (call[1] as { path: string; params: unknown }).path)
    ).toEqual(expectedProjects.map(project => `projects/${project}/global/images`));
    for (let call of requestSpy.mock.calls) {
      expect((call[1] as { params: unknown }).params).toEqual({
        maxResults: 3,
        fields: 'items(name,id,status,family,creationTimestamp),nextPageToken'
      });
    }
    expect(
      result.output.images.map((image: { sourceProject: string }) => image.sourceProject)
    ).toEqual(expectedProjects);
    expect(result.output.nextPageToken).toBeUndefined();
  });

  it('rejects pageToken when no explicit imageProject is provided', async () => {
    await expect(
      listImages.handleInvocation(createContext({ pageToken: 'image-page-2' }))
    ).rejects.toThrow('pageToken is supported only with an explicit imageProject');
    expect(requestSpy).not.toHaveBeenCalled();
  });
});

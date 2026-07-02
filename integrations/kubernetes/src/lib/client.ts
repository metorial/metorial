import { Agent as HttpsAgent } from 'node:https';
import { createAxios } from 'slates';
import { kubernetesApiError, kubernetesServiceError } from './errors';

export interface KubeClientConfig {
  clusterUrl: string;
  token?: string;
  clientCertificate?: string;
  clientKey?: string;
  caCertificate?: string;
  namespace?: string;
  skipTlsVerify?: boolean;
}

export interface KubeListOptions {
  labelSelector?: string;
  fieldSelector?: string;
  limit?: number;
  continueToken?: string;
}

export interface KubeResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    resourceVersion?: string;
    creationTimestamp?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
    [key: string]: any;
  };
  spec?: Record<string, any>;
  status?: Record<string, any>;
  data?: Record<string, any>;
  [key: string]: any;
}

export interface KubeListResponse {
  apiVersion: string;
  kind: string;
  metadata: {
    resourceVersion?: string;
    continue?: string;
    [key: string]: any;
  };
  items: KubeResource[];
}

export interface KubeEvent {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    uid?: string;
    resourceVersion?: string;
    creationTimestamp?: string;
    [key: string]: any;
  };
  involvedObject?: {
    kind?: string;
    namespace?: string;
    name?: string;
    uid?: string;
    [key: string]: any;
  };
  reason?: string;
  note?: string;
  message?: string;
  type?: string;
  eventTime?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  deprecatedFirstTimestamp?: string;
  deprecatedLastTimestamp?: string;
  deprecatedCount?: number;
  deprecatedSource?: Record<string, any>;
  count?: number;
  source?: Record<string, any>;
  reportingController?: string;
  reportingInstance?: string;
  regarding?: {
    kind?: string;
    namespace?: string;
    name?: string;
    uid?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export let resourceApiPaths: Record<string, { apiBase: string; namespaced: boolean }> = {
  pods: { apiBase: '/api/v1', namespaced: true },
  services: { apiBase: '/api/v1', namespaced: true },
  configmaps: { apiBase: '/api/v1', namespaced: true },
  secrets: { apiBase: '/api/v1', namespaced: true },
  podtemplates: { apiBase: '/api/v1', namespaced: true },
  namespaces: { apiBase: '/api/v1', namespaced: false },
  nodes: { apiBase: '/api/v1', namespaced: false },
  persistentvolumes: { apiBase: '/api/v1', namespaced: false },
  persistentvolumeclaims: { apiBase: '/api/v1', namespaced: true },
  serviceaccounts: { apiBase: '/api/v1', namespaced: true },
  endpoints: { apiBase: '/api/v1', namespaced: true },
  events: { apiBase: '/apis/events.k8s.io/v1', namespaced: true },
  resourcequotas: { apiBase: '/api/v1', namespaced: true },
  limitranges: { apiBase: '/api/v1', namespaced: true },
  replicationcontrollers: { apiBase: '/api/v1', namespaced: true },
  deployments: { apiBase: '/apis/apps/v1', namespaced: true },
  statefulsets: { apiBase: '/apis/apps/v1', namespaced: true },
  daemonsets: { apiBase: '/apis/apps/v1', namespaced: true },
  replicasets: { apiBase: '/apis/apps/v1', namespaced: true },
  jobs: { apiBase: '/apis/batch/v1', namespaced: true },
  cronjobs: { apiBase: '/apis/batch/v1', namespaced: true },
  certificatesigningrequests: {
    apiBase: '/apis/certificates.k8s.io/v1',
    namespaced: false
  },
  ingresses: { apiBase: '/apis/networking.k8s.io/v1', namespaced: true },
  networkpolicies: { apiBase: '/apis/networking.k8s.io/v1', namespaced: true },
  poddisruptionbudgets: { apiBase: '/apis/policy/v1', namespaced: true },
  roles: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: true },
  clusterroles: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: false },
  rolebindings: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: true },
  clusterrolebindings: { apiBase: '/apis/rbac.authorization.k8s.io/v1', namespaced: false },
  horizontalpodautoscalers: { apiBase: '/apis/autoscaling/v2', namespaced: true },
  storageclasses: { apiBase: '/apis/storage.k8s.io/v1', namespaced: false },
  customresourcedefinitions: { apiBase: '/apis/apiextensions.k8s.io/v1', namespaced: false },
  endpointslices: { apiBase: '/apis/discovery.k8s.io/v1', namespaced: true },
  priorityclasses: { apiBase: '/apis/scheduling.k8s.io/v1', namespaced: false },
  leases: { apiBase: '/apis/coordination.k8s.io/v1', namespaced: true },
  apiservices: { apiBase: '/apis/apiregistration.k8s.io/v1', namespaced: false },
  mutatingadmissionpolicies: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  },
  mutatingadmissionpolicybindings: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  },
  mutatingwebhookconfigurations: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  },
  validatingadmissionpolicies: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  },
  validatingadmissionpolicybindings: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  },
  validatingwebhookconfigurations: {
    apiBase: '/apis/admissionregistration.k8s.io/v1',
    namespaced: false
  }
};

let supportedResourceTypes = () => Object.keys(resourceApiPaths).join(', ');

let unknownResourceTypeError = (resourceType: string) =>
  kubernetesServiceError(
    `Unknown resource type: ${resourceType}. Supported types: ${supportedResourceTypes()}`
  );

let createHttpsAgent = (config: KubeClientConfig) => {
  let hasTlsOptions =
    !!config.clientCertificate ||
    !!config.clientKey ||
    !!config.caCertificate ||
    config.skipTlsVerify === true;
  if (!hasTlsOptions) return undefined;

  if (
    (config.clientCertificate && !config.clientKey) ||
    (!config.clientCertificate && config.clientKey)
  ) {
    throw kubernetesServiceError(
      'Kubernetes client certificate authentication requires both clientCertificate and clientKey.'
    );
  }

  return new HttpsAgent({
    cert: config.clientCertificate,
    key: config.clientKey,
    ca: config.caCertificate,
    rejectUnauthorized: config.skipTlsVerify === true ? false : undefined
  });
};

export class KubeClient {
  private clusterUrl: string;
  private token: string;
  private defaultNamespace: string;
  private axios: ReturnType<typeof createAxios>;

  constructor(config: KubeClientConfig) {
    this.clusterUrl = config.clusterUrl.replace(/\/+$/, '');
    this.token = config.token || '';
    this.defaultNamespace = config.namespace || 'default';

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    this.axios = createAxios({
      baseURL: this.clusterUrl,
      headers,
      httpsAgent: createHttpsAgent(config)
    });
  }

  private async request<T>(operation: string, run: () => Promise<{ data: T }>): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw kubernetesApiError(error, operation);
    }
  }

  private buildResourcePath(
    resourceType: string,
    namespace?: string,
    resourceName?: string
  ): string {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let path = info.apiBase;
    if (info.namespaced && namespace) {
      path += `/namespaces/${namespace}`;
    }
    path += `/${rt}`;
    if (resourceName) {
      path += `/${resourceName}`;
    }
    return path;
  }

  private resolveNamespace(namespace?: string): string | undefined {
    return namespace || this.defaultNamespace;
  }

  async listResources(
    resourceType: string,
    options?: KubeListOptions & { namespace?: string }
  ): Promise<KubeListResponse> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(options?.namespace) : undefined;
    let path = this.buildResourcePath(rt, ns);

    let params: Record<string, string> = {};
    if (options?.labelSelector) params.labelSelector = options.labelSelector;
    if (options?.fieldSelector) params.fieldSelector = options.fieldSelector;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.continueToken) params.continue = options.continueToken;

    return await this.request(`list ${rt}`, () => this.axios.get(path, { params }));
  }

  async getResource(
    resourceType: string,
    resourceName: string,
    namespace?: string
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    return await this.request(`get ${rt}/${resourceName}`, () => this.axios.get(path));
  }

  async createResource(
    resourceType: string,
    body: Record<string, any>,
    namespace?: string
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns);

    return await this.request(`create ${rt}`, () => this.axios.post(path, body));
  }

  async updateResource(
    resourceType: string,
    resourceName: string,
    body: Record<string, any>,
    namespace?: string
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    return await this.request(`update ${rt}/${resourceName}`, () =>
      this.axios.put(path, body)
    );
  }

  async patchResource(
    resourceType: string,
    resourceName: string,
    patch: Record<string, any>,
    namespace?: string,
    patchType: 'strategic' | 'merge' | 'json' = 'strategic'
  ): Promise<KubeResource> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    let contentTypeMap = {
      strategic: 'application/strategic-merge-patch+json',
      merge: 'application/merge-patch+json',
      json: 'application/json-patch+json'
    };

    return await this.request(`patch ${rt}/${resourceName}`, () =>
      this.axios.patch(path, patch, {
        headers: { 'Content-Type': contentTypeMap[patchType] }
      })
    );
  }

  async deleteResource(
    resourceType: string,
    resourceName: string,
    namespace?: string,
    propagationPolicy?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = this.buildResourcePath(rt, ns, resourceName);

    let body: Record<string, any> | undefined;
    if (propagationPolicy) {
      body = { propagationPolicy };
    }

    return await this.request(`delete ${rt}/${resourceName}`, () =>
      this.axios.delete(path, { data: body })
    );
  }

  async getResourceScale(
    resourceType: string,
    resourceName: string,
    namespace?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = `${this.buildResourcePath(rt, ns, resourceName)}/scale`;

    return await this.request(`get ${rt}/${resourceName} scale`, () => this.axios.get(path));
  }

  async setResourceScale(
    resourceType: string,
    resourceName: string,
    replicas: number,
    namespace?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = `${this.buildResourcePath(rt, ns, resourceName)}/scale`;

    return await this.request(`set ${rt}/${resourceName} scale`, () =>
      this.axios.patch(
        path,
        {
          spec: { replicas }
        },
        {
          headers: { 'Content-Type': 'application/merge-patch+json' }
        }
      )
    );
  }

  async getResourceLogs(
    podName: string,
    namespace?: string,
    options?: {
      container?: string;
      tailLines?: number;
      sinceSeconds?: number;
      previous?: boolean;
    }
  ): Promise<string> {
    let ns = this.resolveNamespace(namespace);
    let path = `/api/v1/namespaces/${ns}/pods/${podName}/log`;

    let params: Record<string, string> = {};
    if (options?.container) params.container = options.container;
    if (options?.tailLines) params.tailLines = String(options.tailLines);
    if (options?.sinceSeconds) params.sinceSeconds = String(options.sinceSeconds);
    if (options?.previous) params.previous = 'true';

    return await this.request(`get pod ${podName} logs`, () =>
      this.axios.get(path, {
        params,
        headers: { Accept: 'text/plain' }
      })
    );
  }

  async restartDeployment(deploymentName: string, namespace?: string): Promise<KubeResource> {
    let ns = this.resolveNamespace(namespace);
    let path = this.buildResourcePath('deployments', ns, deploymentName);

    let now = new Date().toISOString();
    return await this.request(`restart deployment ${deploymentName}`, () =>
      this.axios.patch(
        path,
        {
          spec: {
            template: {
              metadata: {
                annotations: {
                  'kubectl.kubernetes.io/restartedAt': now
                }
              }
            }
          }
        },
        {
          headers: { 'Content-Type': 'application/strategic-merge-patch+json' }
        }
      )
    );
  }

  async listEvents(
    namespace?: string,
    options?: {
      fieldSelector?: string;
      limit?: number;
    }
  ): Promise<KubeListResponse> {
    let ns = this.resolveNamespace(namespace);
    let path = this.buildResourcePath('events', ns);

    let params: Record<string, string> = {};
    if (options?.fieldSelector) params.fieldSelector = options.fieldSelector;
    if (options?.limit) params.limit = String(options.limit);

    return await this.request(`list events in namespace ${ns}`, () =>
      this.axios.get(path, { params })
    );
  }

  async listClusterEvents(options?: {
    fieldSelector?: string;
    limit?: number;
    labelSelector?: string;
  }): Promise<KubeListResponse> {
    let path = this.buildResourcePath('events');

    let params: Record<string, string> = {};
    if (options?.fieldSelector) params.fieldSelector = options.fieldSelector;
    if (options?.limit) params.limit = String(options.limit);
    if (options?.labelSelector) params.labelSelector = options.labelSelector;

    return await this.request('list cluster events', () => this.axios.get(path, { params }));
  }

  async getClusterInfo(): Promise<{
    version: any;
    nodeCount: number;
    nodes: any[];
  }> {
    let [version, nodesResp] = await Promise.all([
      this.request('get server version', () => this.axios.get('/version')),
      this.request<KubeListResponse>('list nodes', () => this.axios.get('/api/v1/nodes'))
    ]);

    let nodes = nodesResp.items || [];
    return {
      version,
      nodeCount: nodes.length,
      nodes: nodes.map((n: any) => ({
        name: n.metadata?.name,
        status:
          n.status?.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True'
            ? 'Ready'
            : 'NotReady',
        kubeletVersion: n.status?.nodeInfo?.kubeletVersion,
        osImage: n.status?.nodeInfo?.osImage,
        architecture: n.status?.nodeInfo?.architecture,
        capacity: n.status?.capacity,
        allocatable: n.status?.allocatable
      }))
    };
  }

  async getNamespaces(): Promise<KubeListResponse> {
    return await this.request('list namespaces', () => this.axios.get('/api/v1/namespaces'));
  }

  async applyResource(body: Record<string, any>, namespace?: string): Promise<KubeResource> {
    let kind = body.kind;
    let resourceType = kindToResourceType(kind);
    let name = body.metadata?.name;
    let info = resourceApiPaths[resourceType];
    if (!info) {
      throw kubernetesServiceError(`Unknown resource kind: ${kind}`);
    }

    let ns = info.namespaced
      ? body.metadata?.namespace || this.resolveNamespace(namespace)
      : undefined;

    try {
      let existing = await this.getResource(resourceType, name, ns);
      // Resource exists — update it
      body.metadata = body.metadata || {};
      body.metadata.resourceVersion = existing.metadata.resourceVersion;
      return await this.updateResource(resourceType, name, body, ns);
    } catch (e: any) {
      if (e?.response?.status === 404 || e?.status === 404) {
        return await this.createResource(resourceType, body, ns);
      }
      throw e;
    }
  }

  async getResourceStatus(
    resourceType: string,
    resourceName: string,
    namespace?: string
  ): Promise<any> {
    let rt = resourceType.toLowerCase();
    let info = resourceApiPaths[rt];
    if (!info) {
      throw unknownResourceTypeError(resourceType);
    }

    let ns = info.namespaced ? this.resolveNamespace(namespace) : undefined;
    let path = `${this.buildResourcePath(rt, ns, resourceName)}/status`;

    return await this.request(`get ${rt}/${resourceName} status`, () => this.axios.get(path));
  }
}

export let kindToResourceType = (kind: string): string => {
  let map: Record<string, string> = {
    Pod: 'pods',
    PodTemplate: 'podtemplates',
    Service: 'services',
    ConfigMap: 'configmaps',
    Secret: 'secrets',
    Namespace: 'namespaces',
    Node: 'nodes',
    PersistentVolume: 'persistentvolumes',
    PersistentVolumeClaim: 'persistentvolumeclaims',
    ServiceAccount: 'serviceaccounts',
    Endpoints: 'endpoints',
    Event: 'events',
    ResourceQuota: 'resourcequotas',
    LimitRange: 'limitranges',
    ReplicationController: 'replicationcontrollers',
    Deployment: 'deployments',
    StatefulSet: 'statefulsets',
    DaemonSet: 'daemonsets',
    ReplicaSet: 'replicasets',
    Job: 'jobs',
    CronJob: 'cronjobs',
    CertificateSigningRequest: 'certificatesigningrequests',
    Ingress: 'ingresses',
    NetworkPolicy: 'networkpolicies',
    PodDisruptionBudget: 'poddisruptionbudgets',
    Role: 'roles',
    ClusterRole: 'clusterroles',
    RoleBinding: 'rolebindings',
    ClusterRoleBinding: 'clusterrolebindings',
    HorizontalPodAutoscaler: 'horizontalpodautoscalers',
    StorageClass: 'storageclasses',
    CustomResourceDefinition: 'customresourcedefinitions',
    EndpointSlice: 'endpointslices',
    PriorityClass: 'priorityclasses',
    Lease: 'leases',
    APIService: 'apiservices',
    MutatingAdmissionPolicy: 'mutatingadmissionpolicies',
    MutatingAdmissionPolicyBinding: 'mutatingadmissionpolicybindings',
    MutatingWebhookConfiguration: 'mutatingwebhookconfigurations',
    ValidatingAdmissionPolicy: 'validatingadmissionpolicies',
    ValidatingAdmissionPolicyBinding: 'validatingadmissionpolicybindings',
    ValidatingWebhookConfiguration: 'validatingwebhookconfigurations'
  };
  return map[kind] || `${kind.toLowerCase()}s`;
};

export let createKubeClient = (
  config: {
    clusterUrl: string;
    namespace?: string;
    skipTlsVerify?: boolean;
  },
  auth: {
    token?: string;
    clientCertificate?: string;
    clientKey?: string;
    caCertificate?: string;
  }
): KubeClient => {
  return new KubeClient({
    clusterUrl: config.clusterUrl,
    token: auth.token,
    clientCertificate: auth.clientCertificate,
    clientKey: auth.clientKey,
    caCertificate: auth.caCertificate,
    namespace: config.namespace,
    skipTlsVerify: config.skipTlsVerify
  });
};

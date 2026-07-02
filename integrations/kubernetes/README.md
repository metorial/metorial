# <img src="https://provider-logos.metorial-cdn.com/kubernetes.png" height="20"> Kubernetes

Manage and orchestrate containerized applications on Kubernetes clusters. Create, update, scale, and delete workloads including Pods, Deployments, StatefulSets, DaemonSets, ReplicaSets, Jobs, and CronJobs. Configure service discovery and load balancing through Services, Ingress, Endpoints, and EndpointSlices. Manage configuration and storage with ConfigMaps, Secrets, PersistentVolumes, PersistentVolumeClaims, and StorageClasses. Control access with Namespaces, RBAC roles and bindings, ServiceAccounts, NetworkPolicies, and PodDisruptionBudgets. Administer cluster infrastructure including Nodes, ResourceQuotas, LimitRanges, PriorityClasses, APIService registrations, and certificate signing requests. Autoscale workloads with HorizontalPodAutoscaler. Define and manage Custom Resource Definitions (CRDs) to extend cluster functionality. Poll stable Kubernetes Events for operational changes. Configure admission webhooks and admission policies to validate or mutate resources before persistence.

## Tools

### Apply Resource

Apply a Kubernetes resource manifest (similar to `kubectl apply`). Creates the resource if it does not exist, or updates it if it does.

### Cluster Info

Retrieve general information about the Kubernetes cluster, including the API server version and a summary of all worker nodes with their status, capacity, and versions.

### Delete Resource

Delete a Kubernetes resource by type and name. Supports all standard resource types. Optionally set the propagation policy to control how dependent resources are cleaned up.

### Get Pod Logs

Retrieve logs from a specific pod. Supports selecting a specific container in multi-container pods, tailing a fixed number of lines, and fetching logs from a previous container instance.

### Get Resource

Retrieve the full details of a specific Kubernetes resource by name and type. Returns the complete resource manifest including metadata, spec, and status. Useful for inspecting the current state and configuration of any resource.

### List Resources

List Kubernetes resources of a given type. Supports all standard resource types including pods, deployments, services, configmaps, secrets, namespaces, nodes, and more. Use **labelSelector** and **fieldSelector** to filter results. Pagination is supported via **limit** and **continueToken**.

### Manage HorizontalPodAutoscaler

Create, update, or get the status of a HorizontalPodAutoscaler (HPA). HPAs automatically scale the number of pod replicas based on CPU utilization, memory usage, or custom metrics.

### Manage ConfigMap or Secret

Create or update Kubernetes ConfigMaps and Secrets. Supports setting key-value data directly, or providing a full manifest. For secrets, values should be provided as plain text — they will be base64-encoded automatically.
Updates can remove specific data keys with `deleteKeys`.

### Manage Deployment

Create, update, scale, or restart a Kubernetes Deployment. Combine multiple operations in one call — for example, update the image and scale replicas simultaneously. Also supports StatefulSets and DaemonSets for similar workload management.
Scale operations are available for Deployments, StatefulSets, and ReplicaSets. DaemonSets can be updated or restarted, but do not expose a scale subresource.

### Manage Job

Create or inspect Kubernetes Jobs and CronJobs. Jobs run workloads to completion; CronJobs schedule jobs on a cron-based schedule.

### Manage Namespace

Create, update, or list Kubernetes namespaces. Use this to organize cluster resources into logical groups for multi-tenancy and isolation.

### Manage RBAC

Create or update RBAC resources: Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings. Use this to define access control policies for users, groups, and service accounts.

### Manage Service

Create or update a Kubernetes Service, including ClusterIP, NodePort, LoadBalancer, and ExternalName types. Also manages Ingress resources for HTTP(S) routing.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

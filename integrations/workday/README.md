# Workday

Read authorized worker, organization, absence, inbox and time-tracking data; run Workday Query Language queries and enabled custom reports; manage worker-bound multi-instance custom objects. The connected account's tenant security policies determine accessible data and actions.

## Connection

Register the OAuth client and use the REST service origin, tenant and authorization endpoint shown by Workday's **View API Clients** task. The authorization and REST service endpoints can use different hosts. Enter HTTPS Workday origins and the complete tenant authorization URL; do not substitute the service host for the authorization host. This connection uses authorization-code OAuth and refreshes an issued refresh token when available.

The requested functional areas are Staffing, Tenant Non-Configurable, Time Off and Leave, Time Tracking and System. Grant only the corresponding tenant security permissions needed for the chosen tools. An integration system user may have no worker identity: `get_current_user` reports that limitation rather than selecting an unrelated worker.

## Tools

| Tools | Behavior |
| --- | --- |
| `list_workers`, `get_worker`, `get_current_user` | Discover authorized workers, read an exact worker and discover the connected worker's minimal ID/display name. |
| `list_organizations`, `get_organization_workers` | List supervisory organizations and their authorized workers. |
| `get_inbox_tasks`, `action_inbox_task` | Read worker tasks and approve or deny an eligible pending approval belonging to the connected worker. An accepted step action does not establish completion of the overall business process. |
| `get_time_off_entries`, `request_time_off` | Read absence details and request a single day of time off with a discovered type and provider quantity unit. Submission may start a business process; it does not guarantee approval. |
| `get_time_blocks` | Read recorded worker time blocks, with supported date and page filters. |
| `execute_wql` | Run authorized WQL queries. Short GET queries support page arguments; long POST queries require pagination in the query itself. |
| `get_custom_report` | Read JSON from an authorized, web-service-enabled report or obtain a downloadable CSV file. Report prompts are tenant-specific. |
| `list_custom_objects`, `get_custom_object`, `create_custom_object`, `update_custom_object`, `delete_custom_object` | Read and manage a worker-bound multi-instance custom type. Writes require a configured reference identifier; list operations require the worker ID. |
| `get_resource` | Read an exact supervisory organization, inbox task, time-off detail or time block. |
| `list_resources` | Discover eligible absence types, valid dates, WQL data sources and WQL fields needed by the existing tools. |

List page sizes are integers from 1 to 100 with zero-based offsets. Preserve the discovered provider identifiers, worker association and quantity units. Custom-object deletion removes the chosen record; associated business-process or audit history can remain. Approval and absence actions can affect personnel records and require explicit authorization.

## Documentation

The implementation follows Workday's [REST directory](https://developer.workday.com/rest-api-explorer), current Common v1, Absence Management v5, Time Tracking v6, WQL v1 and multi-instance Custom Object Data v2 schemas. Tenant-specific authorization, field availability, reports and write permissions require verification in the connected account.

## License

This integration is licensed under [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

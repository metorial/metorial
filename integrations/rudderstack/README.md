# RudderStack

Collect customer events and manage their processing and governance. This integration provides 17 tools:

- Send Event and Send Batch Events support identify, track, page, screen, group and alias ingestion.
- List Transformations, Manage Transformation, List Libraries, Manage Library and Publish Transformations manage draft and published code revisions.
- List Tracking Plans, Manage Tracking Plan and List Tracking Plan Events manage plans and queued catalog event associations.
- Get Event Audit and Get Audit Logs inspect event models and security activity.
- Suppress User, List Regulations and Cancel Regulation manage suppression requests and history.
- Manage Reverse ETL Sync lists, starts, inspects and requests cancellation of connection syncs.
- Test Event Delivery selects transformation or real delivery stages for a destination or an entire source.

Configure a workspace Service Access Token and its US or EU region. Audit logs require an organization Admin token and Enterprise access; a separate optional organization token can be provided. HTTP ingestion additionally requires a Source Write Key and approved Data Plane URL. The older `datePlaneUrl` spelling remains an optional fallback for `dataPlaneUrl`.

Transformation/library lists contain published resources. To inspect drafts, request revision history by resource ID. Publishing code may run validation and affect connected destinations; deleting a model can retain revision history.

Catalog event updates are queued and can take minutes to appear. Removing a tracking-plan event association retains its catalog event. Pagination uses page numbers for plan events, offsets for Reverse ETL, and `nextCursor` plus `nextOffset` for audit logs and regulations; retain the same filters when continuing.

Ingestion acknowledgement does not confirm delivery. Router tests send real events, and source tests fan out to every connected destination. User transformations can make external requests. Test results conceal destination request URLs, headers, parameters, bodies, files and raw downstream responses, retaining stage metadata and status.

Suppression and Event Audit require feature access. Their current official reference pages omit detailed contracts, so retained legacy routes need account-specific confirmation. Suppression acknowledgement does not confirm downstream deletion. Cancellation cannot restore data already deleted; regulation and audit history remains.

Reverse ETL cancellation targets the connection and is asynchronous. Poll the exact sync for a terminal state. This integration does not provision sources, destinations, warehouse connections or Profiles/Activation resources.

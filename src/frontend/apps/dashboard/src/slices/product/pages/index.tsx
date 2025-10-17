import { renderWithLoader } from '@metorial/data-hooks';
import { Paths } from '@metorial/frontend-config';
import { ContentLayout, createInstance, PageHeader } from '@metorial/layout';
import { useBoot, useCurrentInstance, useServerDeployments, useUser } from '@metorial/state';
import { Button, Spacer } from '@metorial/ui';
import { SideBox } from '@metorial/ui-product';
import { Link } from 'react-router-dom';
import { Explainer } from '../../../components/explainer';
import { ApiKeySecret } from '../scenes/apiKeys';
import { useApiKeysWithAutoInit } from '../scenes/apiKeys/useApiKeysWithAutoInit';
import { ServersGrid } from '../scenes/servers/grid';
import { SessionsTable } from '../scenes/sessions/table';

export let ProjectHomePage = () => {
  let instance = useCurrentInstance();
  let user = useUser();

  let boot = useBoot();
  let otherInstancesFromThisProject = boot.data?.instances.filter(
    i => i.project.id == instance.data?.project.id && i.id != instance.data?.id
  );
  let otherProductionInstance = otherInstancesFromThisProject?.find(
    i => i.type == 'production'
  );
  let otherDevelopmentInstance = otherInstancesFromThisProject?.find(
    i => i.type == 'development'
  );

  let deployments = useServerDeployments(instance.data?.id, {
    limit: 1
  });
  let hasDeployments = !!deployments.data?.items.length;

  let apiKeys = useApiKeysWithAutoInit(
    instance.data
      ? {
          type: 'instance_access_token',
          instanceId: instance.data.id
        }
      : undefined
  );

  let pathItems = [
    instance.data?.organization,
    instance.data?.project,
    instance.data
  ] as const;

  let secretApiKey = apiKeys.data?.find(
    a =>
      a.type === 'instance_access_token_secret' &&
      ((a.status == 'active' && a.revealInfo?.forever) ||
        (a.revealInfo?.until && a.revealInfo?.until > new Date()))
  );

  return (
    <ContentLayout>
      {user.data && (
        <PageHeader
          title={`Welcome to Metorial, ${user.data?.name}!`}
          description="It's a good day to build something amazing."
        />
      )}

      {renderWithLoader({ instance, apiKeys, deployments })(() => (
        <>
          {!hasDeployments && (
            <>
              <SideBox
                title="Welcome to Metorial!"
                description={
                  <>
                    Getting started is super easy. Let's begin by{' '}
                    <Link to={Paths.instance.servers(...pathItems)}>
                      deploying your first MCP server
                    </Link>
                    .
                  </>
                }
              >
                <Link to={Paths.instance.servers(...pathItems)}>
                  <Button as="span" size="2">
                    Deploy Server
                  </Button>
                </Link>
              </SideBox>

              <Spacer height={25} />
            </>
          )}

          <div
            style={{
              display: 'grid',
              gap: 20,
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'
            }}
          >
            <SideBox
              title="Integrate Metorial"
              description="Learn how to integrate Metorial with your AI app. We have guides for various programming languages and frameworks."
            >
              <Button
                size="2"
                onClick={() => {
                  // @ts-ignore
                  if (window.metorial_enterprise) {
                    // @ts-ignore
                    window.metorial_enterprise?.chrome.showDocs();
                  } else {
                    window.open('https://metorial.com/docs', '_blank');
                  }
                }}
              >
                Read the Docs
              </Button>
            </SideBox>

            {secretApiKey && (
              <SideBox
                title="Connect to Metorial"
                description="Use this API key to connect to Metorial from your code."
              >
                <ApiKeySecret apiKey={secretApiKey} />
              </SideBox>
            )}
          </div>

          <Spacer height={25} />

          {instance.data?.type == 'development' ? (
            <>
              {otherProductionInstance ? (
                <SideBox
                  title="Switch to Production"
                  description={
                    <>
                      You are currently using a development instance. Switch to your{' '}
                      {otherProductionInstance.name.toLowerCase()} instance for increased
                      performance and reliability.
                    </>
                  }
                >
                  <Link
                    to={Paths.instance(
                      otherProductionInstance.organization,
                      otherProductionInstance.project,
                      otherProductionInstance
                    )}
                  >
                    <Button as="span" size="2">
                      Switch to Production
                    </Button>
                  </Link>
                </SideBox>
              ) : (
                <SideBox
                  title="Switch to Production"
                  description={
                    <>
                      You are currently using a development instance. Switch to a production
                      instance for increased performance and reliability.
                    </>
                  }
                >
                  <Button
                    size="2"
                    onClick={async () => {
                      // @ts-ignore
                      await window.metorial_enterprise?.beforeCreateInstance?.();
                      createInstance(instance.data?.project!, { type: 'production' });
                    }}
                  >
                    Set up Production Instance
                  </Button>
                </SideBox>
              )}

              <Spacer height={25} />
            </>
          ) : (
            <>
              {otherDevelopmentInstance && (
                <SideBox
                  title="Switch to Development"
                  description={
                    <>
                      You are currently using a production instance. Switch to your{' '}
                      {otherDevelopmentInstance.name.toLowerCase()} instance to test changes
                      before deploying to production.
                    </>
                  }
                >
                  <Link
                    to={Paths.instance(
                      otherDevelopmentInstance.organization,
                      otherDevelopmentInstance.project,
                      otherDevelopmentInstance
                    )}
                  >
                    <Button as="span" size="2">
                      Switch to Development
                    </Button>
                  </Link>
                </SideBox>
              )}

              <Spacer height={25} />
            </>
          )}

          <Spacer height={10} />

          <PageHeader
            title="Featured Servers"
            description="Explore some of the most popular servers in the Metorial community."
            size="5"
          />

          <ServersGrid
            orderByRank
            limit={6}
            collectionId={(window as any).metorial_enterprise?.landing_collection_ids}
          />

          <Spacer height={35} />

          <PageHeader
            title="Recent MCP Sessions"
            description="Your recent MCP sessions are listed below. Click on a session to view its details."
            size="5"
          />

          <SessionsTable limit={15} />
        </>
      ))}

      <Explainer
        title="Welcome to Metorial"
        description="Let us show you around the dashboard and help you get started with your first MCP server."
        youtubeId="_hAvxzTCLyQ"
        id="home"
      />
    </ContentLayout>
  );
};

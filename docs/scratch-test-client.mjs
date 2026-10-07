import { createClient } from "tinacms/dist/client.js";

const client = createClient({ url: 'http://localhost:4001/graphql', queries: (client) => ({
  docs: (args) => client.request({
    query: `query DocsQuery($relativePath: String!) {
      docs(relativePath: $relativePath) {
        title
        description
        body
      }
    }`,
    variables: args
  })
}) });

try {
  const res = await client.queries.docs({ relativePath: 'getting-started.mdx' });
  console.log('Result title:', res?.data?.docs?.title);
  console.log('Result body children:', res?.data?.docs?.body?.children?.length);
  console.log('First child:', res?.data?.docs?.body?.children?.[0]);
} catch (e) {
  console.error('Error querying:', e);
}

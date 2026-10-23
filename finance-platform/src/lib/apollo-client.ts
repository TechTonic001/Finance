import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { ApolloLink } from "@apollo/client/link";
import { ErrorLink } from "@apollo/client/link/error";

export function createApolloClient() {
  const errorLink = new ErrorLink(({ error, operation }) => {
    if (CombinedGraphQLErrors.is(error)) {
      console.error(`[GraphQL error] ${operation.operationName}:`, error.errors);
      return;
    }

    console.error(`[Network error] ${operation.operationName}:`, error);
  });

  return new ApolloClient({
    link: ApolloLink.from([
      errorLink,
      new HttpLink({
        uri: process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "/api/graphql",
        credentials: "same-origin",
      }),
    ]),
    cache: new InMemoryCache(),
  });
}
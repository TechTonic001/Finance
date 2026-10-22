import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from "@apollo/client";
import { CombinedGraphQLErrors, CombinedProtocolErrors } from "@apollo/client/errors";
import { ErrorLink } from "@apollo/client/link/error";

export function createApolloClient() {
  const errorLink = new ErrorLink(({ error, operation }) => {
    if (CombinedGraphQLErrors.is(error)) {
      for (const graphQLError of error.errors) {
        console.error(
          `[GraphQL error] ${operation.operationName || "Unnamed operation"}: ${graphQLError.message}`,
          graphQLError,
        );
      }
      return;
    }

    if (CombinedProtocolErrors.is(error)) {
      for (const protocolError of error.errors) {
        console.error(
          `[GraphQL protocol error] ${operation.operationName || "Unnamed operation"}: ${protocolError.message}`,
          protocolError,
        );
      }
      return;
    }

    console.error(
      `[Network error] ${operation.operationName || "Unnamed operation"}: ${error.message}`,
      error,
    );
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
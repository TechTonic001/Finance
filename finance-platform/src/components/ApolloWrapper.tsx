"use client";

import { ApolloProvider } from "@apollo/client/react";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { createApolloClient } from "@/lib/apollo-client";

export default function ApolloWrapper({ children }: { children: ReactNode }) {
  const [client] = useState(createApolloClient);

  return (
    <SessionProvider>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </SessionProvider>
  );
}
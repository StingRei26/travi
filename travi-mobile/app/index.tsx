import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to sign-in, the _layout will handle auth-based routing
  return <Redirect href="/sign-in" />;
}

// This file exists only to satisfy the Tabs.Screen "create-placeholder" route.
// The actual create button navigates to /plan via the custom tab button.
import { Redirect } from "expo-router";
export default function CreatePlaceholder() {
  return <Redirect href="/plan" />;
}

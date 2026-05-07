import { getSubscriptions } from "@/lib/actions/subscriptions";
import SubscriptionsClient from "./SubscriptionsClient";

export default async function SubscriptionsPage() {
  const subscriptions = await getSubscriptions();
  return <SubscriptionsClient subscriptions={subscriptions} />;
}

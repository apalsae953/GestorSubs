import { getSubscriptions } from "@/lib/actions/subscriptions";
import CheckinClient from "./CheckinClient";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function CheckinPage() {
  const subscriptions = await getSubscriptions();
  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: es });

  return <CheckinClient subscriptions={subscriptions} today={today} />;
}

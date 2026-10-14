import { getCurrentUser } from "@/lib/auth";
import { ChatWidget } from "./chat-widget";

export async function ChatWidgetLoader() {
  const user = await getCurrentUser();
  return <ChatWidget signedIn={!!user} />;
}

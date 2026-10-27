import ChatClient from "@/app/chat/ChatClient";

export const metadata = {
  title: "Chat — OmniRoute",
  description: "Mobile-friendly chat using models connected through OmniRoute.",
};

export default function DashboardChatPage() {
  return <ChatClient />;
}

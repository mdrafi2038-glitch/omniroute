"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Model = { id: string; name?: string };

export default function ChatClient() {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(true);

  const claudeModels = useMemo(() => {
    const matching = models.filter((item) => /claude/i.test(item.id + " " + (item.name || "")));
    return matching.length ? matching : models;
  }, [models]);

  useEffect(() => {
    if (model && claudeModels.some((item) => item.id === model)) return;
    if (claudeModels.length) setModel(claudeModels[0].id);
  }, [claudeModels, model]);

  async function loadModels() {
    setError("");
    setLoadingModels(true);
    try {
      const response = await fetch("/v1/models", {
        headers: apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {},
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || data?.message || `Model list failed (${response.status})`);
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
      const parsed = list.map((item: any) => ({
        id: String(item.id || item.model || ""),
        name: item.name ? String(item.name) : undefined,
      })).filter((item: Model) => item.id);
      setModels(parsed);
      if (!parsed.length) setError("কোনো model পাওয়া যায়নি। Provider connect আছে কি না এবং API key ঠিক কি না দেখো।");
      else setShowSettings(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "মডেল লোড করা যায়নি।");
    } finally {
      setLoadingModels(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    if (!model) {
      setError("আগে model load করে একটি model নির্বাচন করো।");
      setShowSettings(true);
      return;
    }
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setDraft("");
    setError("");
    setSending(true);
    try {
      const response = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey.trim() ? { Authorization: `Bearer ${apiKey.trim()}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: nextMessages,
          stream: false,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error?.message || data?.message || `Request failed (${response.status})`);
      const answer = data?.choices?.[0]?.message?.content;
      const answerText = typeof answer === "string" ? answer : Array.isArray(answer) ? answer.map((part: any) => part.text || "").join("") : "";
      if (!answerText) throw new Error("উত্তর পাওয়া যায়নি। Model/provider configuration পরীক্ষা করো।");
      setMessages([...nextMessages, { role: "assistant", content: answerText }]);
    } catch (err) {
      setMessages(nextMessages);
      setError(err instanceof Error ? err.message : "মেসেজ পাঠানো যায়নি।");
    } finally {
      setSending(false);
    }
  }

  function newChat() {
    setMessages([]);
    setDraft("");
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#0b1020] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-3 pb-4 pt-3 sm:px-6">
        <header className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="min-w-0">
            <a href="/dashboard" className="text-xs text-slate-400 hover:text-white">← Dashboard</a>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">OmniRoute Chat</h1>
            <p className="text-xs text-slate-400">Chat with Claude through your OmniRoute providers</p>
          </div>
          <button type="button" onClick={newChat} className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-sm hover:bg-white/10">＋ New chat</button>
        </header>

        {showSettings && (
          <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold">Chat setup</h2>
              <span className="rounded-full bg-indigo-400/15 px-2 py-1 text-xs text-indigo-200">Private key input</span>
            </div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="omniroute-api-key">OmniRoute API key (optional if your server allows access without one)</label>
            <input id="omniroute-api-key" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Paste API key here" className="mb-3 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-3 text-base outline-none focus:border-indigo-400" />
            <label className="mb-1 block text-sm text-slate-300" htmlFor="omniroute-model">Model</label>
            <select id="omniroute-model" value={model} onChange={(event) => setModel(event.target.value)} className="mb-3 w-full rounded-xl border border-white/15 bg-[#151b2d] px-3 py-3 text-base outline-none focus:border-indigo-400">
              {claudeModels.length === 0 && <option value="">Load available models first</option>}
              {claudeModels.map((item) => <option key={item.id} value={item.id}>{item.name ? `${item.name} — ${item.id}` : item.id}</option>)}
            </select>
            <button type="button" disabled={loadingModels} onClick={loadModels} className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-semibold text-white disabled:opacity-60">{loadingModels ? "Loading models…" : "Load models"}</button>
            <p className="mt-2 text-xs leading-5 text-slate-400">Keyটি শুধু এই পেজের memory-তে থাকে; browser storage-এ save করা হয় না। পেজ বন্ধ/refresh করলে আবার দিতে হবে।</p>
          </section>
        )}

        {!showSettings && (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <div className="min-w-0 text-sm"><span className="text-slate-400">Model: </span><span className="break-all font-medium">{model}</span></div>
            <button type="button" onClick={() => setShowSettings(true)} className="shrink-0 rounded-lg px-2 py-1 text-sm text-indigo-300 hover:bg-white/10">Change</button>
          </div>
        )}

        <section aria-live="polite" className="mb-3 flex-1 space-y-4">
          {messages.length === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center">
              <div className="mb-3 text-3xl">✦</div>
              <h2 className="text-lg font-semibold">What would you like to ask Claude?</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-400">Connect a Claude provider in Dashboard → Providers, then load models and start chatting here.</p>
            </div>
          )}
          {messages.map((message, index) => (
            <article key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-[15px] leading-6 sm:max-w-[85%] ${message.role === "user" ? "bg-indigo-600 text-white" : "border border-white/10 bg-white/[0.06] text-slate-100"}`}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-60">{message.role === "user" ? "You" : "Claude / OmniRoute"}</div>
                {message.content || (sending && index === messages.length - 1 ? "Thinking…" : "")}
              </div>
            </article>
          ))}
          {error && <div role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</div>}
        </section>

        <form onSubmit={sendMessage} className="sticky bottom-0 rounded-2xl border border-white/10 bg-[#11182a] p-2 shadow-2xl">
          <label className="sr-only" htmlFor="chat-message">Message</label>
          <textarea id="chat-message" value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} placeholder="Message Claude…" className="max-h-40 min-h-14 w-full resize-y bg-transparent px-2 py-2 text-base outline-none placeholder:text-slate-500" />
          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
            <span className="px-2 text-[11px] text-slate-500">Enter send নয় — Send চাপো</span>
            <button type="submit" disabled={sending || !draft.trim()} className="rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{sending ? "Sending…" : "Send ↑"}</button>
          </div>
        </form>
        <p className="pt-3 text-center text-[11px] text-slate-500">Requests are sent to this OmniRoute server. Provider usage or charges may apply.</p>
      </div>
    </main>
  );
}

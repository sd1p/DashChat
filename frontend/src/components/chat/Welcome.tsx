import { MessageSquare } from "lucide-react";

// Ported from _legacy/src/components/Chat/Welcome.tsx. Shown in the chat pane
// when no chat is selected (desktop only — on mobile the sidebar is the home
// screen). Redesigned as a clean empty state: a soft brand-tinted icon badge
// and a pure-CSS typing line (no extra runtime dep).
const Welcome = () => {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-5 bg-[#ddddf7] px-6 text-center text-[#2f2d52]">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[#8da4f1]/20 text-[#8da4f1] shadow-sm">
        <MessageSquare className="size-8" />
      </div>

      <strong className="text-3xl font-semibold tracking-tight sm:text-4xl">
        Welcome to <span className="text-[#8DA4F1]">DashChat</span>
      </strong>

      <span
        className="overflow-hidden whitespace-nowrap border-r-2 border-[#8DA4F1] pr-1 text-base text-[#5d5b8d] sm:text-lg [animation:welcome-type_3s_steps(40,end)_infinite_alternate,welcome-caret_0.7s_step-end_infinite]"
        style={{ width: "fit-content" }}
      >
        Select a chat to start a conversation.
      </span>

      {/* Keyframes kept local to this component. */}
      <style>{`
        @keyframes welcome-type { from { max-width: 0 } to { max-width: 22rem } }
        @keyframes welcome-caret { 50% { border-color: transparent } }
      `}</style>
    </div>
  );
};

export default Welcome;

// Ported from _legacy/src/components/Chat/Welcome.tsx. The original used the
// typewriter-effect dependency; this reproduces the look with a pure-CSS typing
// animation (steps() + a blinking caret) so no extra runtime dep is needed.
// Shown in the chat pane when no chat is selected. Old SCSS: bg #ddddf7, large
// Inter text centered.
const Welcome = () => {
  return (
    <div className="flex flex-[2.5] flex-col items-center justify-center gap-4 bg-[#ddddf7] text-center text-[#2f2d52]">
      <strong className="text-4xl">
        Welcome to <span className="text-[#8DA4F1]">DashChat</span>.
      </strong>
      <span
        className="overflow-hidden whitespace-nowrap border-r-2 border-[#8DA4F1] pr-1 text-lg text-[#5d5b8d] [animation:welcome-type_3s_steps(40,end)_infinite_alternate,welcome-caret_0.7s_step-end_infinite]"
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

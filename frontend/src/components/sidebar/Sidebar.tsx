import Navbar from "./Navbar";
import Search from "./Search";
import Chats from "./Chats";

// Ported from _legacy/src/components/Sidebar/Sidebar.tsx. Old SCSS: flex:1,
// background #3e3c61 (brand-sidebar). Navbar / Search / Chats stacked; the chat
// list scrolls (Chats owns its own ScrollArea). A right border separates the
// rail from the conversation pane on desktop, shadcn-style.
const Sidebar = () => {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-r border-white/10 bg-brand-sidebar">
      <Navbar />
      <Search />
      <Chats />
    </div>
  );
};

export default Sidebar;

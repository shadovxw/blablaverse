import { Navigate, Route, Routes } from "react-router";
import * as React from "react";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import HomePage from "./pages/HomePage/page";
import SiteHeader from "./components/sidebar/SiteHeader";
import ChatInterface from "./components/chat/ChatInterface";
import { useChatStore } from "./store/useChatStore";

import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
  const { selectedUser } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <div className={`bg-background text-foreground flex flex-col ${authUser ? "h-screen w-full overflow-hidden" : "min-h-screen"}`}>
      {authUser ? (
        <div className="flex-1 flex overflow-hidden h-full w-full">
          <SidebarProvider
            className="h-full w-full bg-transparent overflow-hidden"
            defaultOpen={true}
            style={{
              "--sidebar-width": "350px",
              "--sidebar-width-icon": "48px",
            }}
          >
            <AppSidebar />
            <div className="flex-1 flex flex-col overflow-hidden h-full bg-background">
              {/* SITE HEADER */}
              <SiteHeader />

              {/* MAIN CONTENT VIEWPORT */}
              <main className="flex-1 overflow-hidden min-h-0 pt-4">
                <Routes>
                  {/* <Route path="/" element={<ChatPage />} /> */}
                  <Route path="/" element={selectedUser ? <ChatInterface /> : <HomePage />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          </SidebarProvider>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-900 relative flex items-center justify-center p-4 overflow-hidden">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </div>
      )}

      <Toaster />
    </div>
  );
}
export default App;



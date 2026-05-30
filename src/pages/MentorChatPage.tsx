import { useState, useRef, useEffect } from "react";
import { Send, Bot, User as UserIcon, MessageSquare, Plus, MoreHorizontal, Edit2, Trash2, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/store";
import { apiRequest } from "@/lib/api";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface Session {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface MentorChatPageProps {
  user: User;
}

export default function MentorChatPage({ user }: MentorChatPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load all sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await apiRequest<Session[]>(`/api/users/${user.id}/mentor-chat/sessions`);
        setSessions(data);
        if (data.length > 0 && !currentSessionId) {
          setCurrentSessionId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      }
    };
    fetchSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Load messages when currentSessionId changes
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }
    const fetchMessages = async () => {
      try {
        const msgs = await apiRequest<Message[]>(`/api/users/${user.id}/mentor-chat/sessions/${currentSessionId}/messages`);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    fetchMessages();
  }, [currentSessionId, user.id]);

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setError(null);
    setInput("");
    inputRef.current?.focus();
    setIsMobileOpen(false);
  };

  const handleSelectSession = (id: string) => {
    setCurrentSessionId(id);
    setIsMobileOpen(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    try {
      await apiRequest(`/api/users/${user.id}/mentor-chat/sessions/${sessionId}`, { method: "DELETE" });
      setSessions((prev) => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleRenameSession = async (sessionId: string, currentTitle: string) => {
    const newTitle = prompt("Enter new title:", currentTitle);
    if (!newTitle || newTitle.trim() === "" || newTitle === currentTitle) return;
    try {
      const updated = await apiRequest<Session>(`/api/users/${user.id}/mentor-chat/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ title: newTitle.trim() })
      });
      setSessions((prev) => prev.map(s => s.id === sessionId ? updated : s));
    } catch (err) {
      console.error("Failed to rename session", err);
    }
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    let targetSessionId = currentSessionId;
    let isNewSession = false;

    setIsLoading(true);
    setError(null);

    try {
      // Create session if it doesn't exist
      if (!targetSessionId) {
        const newSession = await apiRequest<Session>(`/api/users/${user.id}/mentor-chat/sessions`, {
          method: "POST"
        });
        targetSessionId = newSession.id;
        setCurrentSessionId(newSession.id);
        setSessions((prev) => [newSession, ...prev]);
        isNewSession = true;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: trimmed,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");

      const response = await apiRequest<{ reply: string }>(`/api/users/${user.id}/mentor-chat/sessions/${targetSessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: trimmed }),
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If it was a new session, refetch sessions to get the auto-generated title
      if (isNewSession) {
        const updatedSessions = await apiRequest<Session[]>(`/api/users/${user.id}/mentor-chat/sessions`);
        setSessions(updatedSessions);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to communicate with AI Mentor.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentSession = sessions.find(s => s.id === currentSessionId);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <Button onClick={handleNewChat} variant="outline" className="w-full justify-start gap-2 bg-background hover:bg-muted">
          <Plus className="w-4 h-4" />
          New Chat
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {sessions.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No chats yet.
          </div>
        )}
        {sessions.map(session => (
          <div
            key={session.id}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              currentSessionId === session.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground"
            }`}
            onClick={() => handleSelectSession(session.id)}
          >
            <div className="flex items-center gap-2 overflow-hidden mr-2">
              <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />
              <span className="text-sm truncate">{session.title}</span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRenameSession(session.id, session.title); }}>
                  <Edit2 className="w-4 h-4 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteSession(session.id); }} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-6rem)] max-w-6xl mx-auto w-full border border-border rounded-xl bg-card overflow-hidden">
      
      {/* Desktop Sidebar Area */}
      <div className="w-64 border-r border-border bg-muted/20 hidden md:flex flex-col">
        <SidebarContent />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-3">
          {/* Mobile Sidebar Toggle */}
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 hidden sm:flex">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-lg truncate">{currentSession ? currentSession.title : "New Chat"}</h2>
            <p className="text-sm text-muted-foreground truncate hidden sm:block">AI Mentor is ready to help</p>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground">How can I help you today?</h3>
              <p className="max-w-md px-4">I can review your profile, provide study resources, conduct mock interviews, or guide your career roadmap.</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {msg.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-muted rounded-tl-sm text-foreground"
              }`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm text-center">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border bg-muted/10">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message AI Mentor..."
              className="flex-1 min-h-[44px] max-h-32 bg-background border border-input rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-[44px] w-[44px] shrink-0 rounded-xl"
              size="icon"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}

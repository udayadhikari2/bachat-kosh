"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Bell, 
  Check, 
  Trash2, 
  MessageCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { getNotifications, markAsRead, deleteNotification } from "@/lib/actions/notification";
import { formatDistanceToNow } from "date-fns";

export default function NotificationDrawer({ 
  isOpen, 
  onClose, 
  userId, 
  role 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  userId: string; 
  role: string;
}) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchNotifications() {
    if (!userId) return;
    setLoading(true);
    const result = await getNotifications(userId, role);
    if (result.success) setNotifications(result.data);
    setLoading(false);
  }

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen]);

  async function handleMarkRead(id: string) {
    const result = await markAsRead(id);
    if (result.success) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteNotification(id);
    if (result.success) {
      setNotifications(prev => prev.filter(n => n._id !== id));
    }
  }

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto transition-opacity duration-500 ease-in-out" 
        onClick={onClose} 
      />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md pointer-events-auto">
          <div className="h-full flex flex-col bg-slate-900 shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="px-6 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/20">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="w-6 h-6 text-emerald-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Notifications</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Updates & Alert Center</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">Fetching messages...</p>
                </div>
              ) : notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = notification.type === "WARNING" ? AlertTriangle : 
                               notification.type === "SUCCESS" ? CheckCircle2 : Info;
                  const colorClass = notification.type === "WARNING" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : 
                                     notification.type === "SUCCESS" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" : 
                                     "text-blue-400 bg-blue-400/10 border-blue-400/20";

                  return (
                    <div 
                      key={notification._id}
                      className={`group relative p-4 rounded-2xl border transition-all duration-300 ${
                        notification.isRead 
                          ? "bg-slate-900/30 border-slate-800/50 opacity-60 hover:opacity-100" 
                          : "bg-slate-800/40 border-slate-700 shadow-lg shadow-emerald-500/5"
                      }`}
                    >
                      <div className="flex gap-4">
                        <div className={`p-2.5 h-fit rounded-xl border ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-sm font-bold ${notification.isRead ? "text-slate-300" : "text-white"}`}>
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                            )}
                          </div>
                          <p className={`text-xs leading-relaxed ${notification.isRead ? "text-slate-500" : "text-slate-400"}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] text-slate-500 font-medium italic">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            <div className="flex items-center gap-1">
                              {!notification.isRead && (
                                <button 
                                  onClick={() => handleMarkRead(notification._id)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                                  title="Mark as Read"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button 
                                onClick={() => handleDelete(notification._id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-4 bg-slate-950/40 rounded-3xl border border-slate-800">
                    <Bell className="w-8 h-8 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Nothing here yet</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                      You're all caught up. New notifications will appear here.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/20">
              <button 
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Close Drawer
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

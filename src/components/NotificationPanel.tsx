import React from 'react';
import { Bell, Check, CheckCircle2, RefreshCw, ShoppingBag, CreditCard, Users, Clock, Award, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification } from '../types.ts';

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
  onTriggerSimulation: () => void;
  isSimulating: boolean;
}

export default function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onTriggerSimulation,
  isSimulating
}: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return <ShoppingBag className="w-4 h-4 text-indigo-500" />;
      case 'order_status_updated':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'staff_update':
        return <Users className="w-4 h-4 text-amber-500" />;
      case 'client_update':
        return <Award className="w-4 h-4 text-purple-500" />;
      case 'system':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      default:
        return <Sparkles className="w-4 h-4 text-blue-500" />;
    }
  };

  const getNotifBadgeColor = (type: string) => {
    switch (type) {
      case 'order_created':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case 'order_status_updated':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'staff_update':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'client_update':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'system':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full max-h-[520px]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative p-1.5 bg-slate-50 rounded-lg">
            <Bell className="w-4.5 h-4.5 text-slate-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <h3 className="font-display font-semibold text-slate-800 text-sm">Activité en Direct</h3>
            <p className="text-[10px] text-slate-400 font-mono">
              {unreadCount} non lus • Flux Real-time
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 bg-indigo-50 hover:bg-indigo-100/70 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3 h-3" /> Tout lire
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        <AnimatePresence initial={false}>
          {notifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Aucune notification en temps réel.</p>
              <p className="text-[10px] text-slate-400 mt-1">Les actions en cuisine, réservations et staff s'afficheront ici instantanément.</p>
            </motion.div>
          ) : (
            notifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -10, y: -5 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`p-3 rounded-xl border transition-all relative flex gap-3 text-left ${
                  notif.isRead
                    ? 'bg-white border-slate-100 opacity-70'
                    : 'bg-slate-50/50 border-slate-200/80 shadow-2xs'
                }`}
              >
                <div className={`p-2 rounded-lg border h-fit shrink-0 ${getNotifBadgeColor(notif.type)}`}>
                  {getNotifIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <h4 className={`text-xs font-semibold truncate ${notif.isRead ? 'text-slate-600' : 'text-slate-800'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-[9px] text-slate-400 font-mono shrink-0">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed break-words">
                    {notif.message}
                  </p>
                </div>

                {!notif.isRead && (
                  <button
                    onClick={() => onMarkAsRead(notif.id)}
                    className="absolute right-2 top-2 p-1 text-slate-300 hover:text-indigo-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-100 transition-all cursor-pointer"
                    title="Marquer comme lu"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
        <button
          onClick={onTriggerSimulation}
          disabled={isSimulating}
          className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 hover:text-slate-950 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-2xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          {isSimulating ? 'Simulation...' : 'Simuler un événement de restaurant'}
        </button>
      </div>
    </div>
  );
}

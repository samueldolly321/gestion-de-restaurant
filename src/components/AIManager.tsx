import React, { useState } from 'react';
import { Sparkles, Send, Award, Clock, Utensils, Package, Brain, RefreshCw, Star } from 'lucide-react';

interface AIManagerProps {
  token: string | null;
  dbUserId: number | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function AIManager({ token, dbUserId }: AIManagerProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Manao ahoana! Je suis votre Conseiller IA ChefSuite. Je peux analyser en temps réel vos ventes, vos stocks, et calculer un indice de méritocratie objectif pour votre personnel. Cliquez sur l'une des suggestions ci-dessous ou posez-moi votre question directement !",
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const handleSendPrompt = async (selectedPrompt?: string) => {
    const textToSend = selectedPrompt || prompt;
    if (!textToSend.trim() || !token || !dbUserId) return;

    // Add user message
    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ dbUserId, prompt: textToSend })
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok) {
        // On remonte le vrai message du serveur (ex. clé API manquante) au lieu d'un message générique.
        throw new Error(data.error || "L'IA n'a pas pu traiter la demande.");
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: data.text || "Désolé, je n'ai pas reçu de réponse cohérente.",
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ Erreur : ${err.message || "Une erreur réseau est survenue."}`,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  const formatBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-slate-800">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderAIResponse = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="text-sm font-black text-slate-900 mt-4 mb-2 font-display flex items-center gap-1">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="text-sm font-black text-red-600 mt-5 mb-2 border-b border-red-50 pb-1 font-display uppercase tracking-wider">{line.replace('## ', '')}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} className="text-base font-black text-slate-950 mt-5 mb-2 font-display">{line.replace('# ', '')}</h2>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleanLine = line.trim().replace(/^[-*]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-600 my-1 leading-relaxed">
            {formatBoldText(cleanLine)}
          </li>
        );
      }
      const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-slate-600 my-1 leading-relaxed">
            {formatBoldText(numMatch[2])}
          </li>
        );
      }
      if (!line.trim()) return <div key={idx} className="h-2" />;
      return (
        <p key={idx} className="text-xs text-slate-600 leading-relaxed my-1">
          {formatBoldText(line)}
        </p>
      );
    });
  };

  const suggestions = [
    {
      title: "🏆 Méritocratie",
      desc: "Calculez les scores de mérite du personnel selon leur statut et activité.",
      prompt: "Fais-moi un audit complet du personnel. Établis un classement de méritocratie équitable avec des scores ou indices de mérite sur 100 pour chaque employé. Donne des conseils de management pour récompenser les meilleurs et encourager le reste de l'équipe.",
      icon: Award,
      color: "border-yellow-200 bg-yellow-50/30 text-yellow-700 hover:border-yellow-300"
    },
    {
      title: "🍲 Plats populaires",
      desc: "Découvrez les plats qui se vendent le plus et ceux qui performent le moins.",
      prompt: "Analyse les plats du menu et l'historique des commandes. Quels plats se vendent le plus et lesquels se vendent le moins ? Propose des optimisations pour la carte.",
      icon: Utensils,
      color: "border-red-200 bg-red-50/30 text-red-700 hover:border-red-300"
    },
    {
      title: "👥 Charge de travail",
      desc: "Vérifiez qui travaille le plus ou le moins, et l'état des congés.",
      prompt: "Qui parmi le personnel travaille le plus et qui travaille le moins ? Liste également le statut actif de chacun et les congés prévus.",
      icon: Clock,
      color: "border-teal-200 bg-teal-50/30 text-teal-700 hover:border-teal-300"
    },
    {
      title: "📦 Ruptures de Stocks",
      desc: "Anticipez les ruptures et préparez les commandes fournisseurs.",
      prompt: "Vérifie l'état de l'inventaire. Quels ingrédients sont en rupture ou en quantité critique, et que faut-il commander d'urgence auprès de nos fournisseurs ?",
      icon: Package,
      color: "border-blue-200 bg-blue-50/30 text-blue-700 hover:border-blue-300"
    }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Tab Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Brain className="w-56 h-56 rotate-12 text-white" />
        </div>
        <div className="relative z-10 space-y-1 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400 text-slate-950 uppercase tracking-wide">
            <Sparkles className="w-3 h-3 fill-current" /> Intelligence Artificielle
          </div>
          <h2 className="font-display text-lg sm:text-xl font-black text-white">
            Centre de Décision IA & Méritocratie
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Consultez les suggestions automatiques ou pilotez votre équipe en toute impartialité grâce à des rapports générés à partir des données réelles de vos ventes, de vos stocks et des présences en Ariary.
          </p>
        </div>
        <Brain className="w-12 h-12 text-yellow-400 shrink-0 hidden md:block" />
      </div>

      {/* Main Grid: Suggestions Left, Chat Box Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Suggestion Bento Cards */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="font-display font-bold text-xs text-slate-400 uppercase tracking-wider">
            Analyses Instantanées
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {suggestions.map((s, idx) => {
              const IconComp = s.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(s.prompt)}
                  disabled={loading}
                  className={`border p-4 rounded-2xl text-left transition-all flex flex-col gap-2 relative group cursor-pointer disabled:opacity-50 ${s.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-display">{s.title}</span>
                    <IconComp className="w-4 h-4 shrink-0" />
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    {s.desc}
                  </p>
                  <span className="text-[9px] font-bold underline mt-1 block group-hover:translate-x-1 transition-transform">
                    Lancer l'analyse →
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat / Report Area */}
        <div className="lg:col-span-8 flex flex-col h-[520px] bg-white border border-slate-100 rounded-3xl shadow-3xs overflow-hidden">
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-700">ChefSuite IA - Mode Audit Madagascar</span>
            </div>
            {loading && (
              <span className="text-[10px] font-bold text-slate-400 font-mono flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" /> Génération du rapport...
              </span>
            )}
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/20">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] ${
                  m.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-left shadow-3xs ${
                    m.role === 'user'
                      ? 'bg-red-600 text-white rounded-tr-none'
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="text-xs font-semibold leading-relaxed">{m.content}</p>
                  ) : (
                    <div className="space-y-1.5">
                      {renderAIResponse(m.content)}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 font-mono">{m.timestamp}</span>
              </div>
            ))}

            {/* Simulated typing loading */}
            {loading && (
              <div className="flex flex-col max-w-[85%] mr-auto items-start">
                <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-3xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <Brain className="w-4 h-4 text-red-600 animate-pulse" />
                    <span className="font-semibold">Calcul de la méritocratie et compilation des ventes...</span>
                  </div>
                  <div className="flex gap-1.5 py-1">
                    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce delay-100" />
                    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce delay-200" />
                    <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce delay-300" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Prompt input footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt();
            }}
            className="p-3 border-t border-slate-100 bg-white flex gap-2 items-center"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Posez votre question (ex: Qui travaille le moins ?, Quels plats se vendent le mieux ?)"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs focus:ring-1 focus:ring-red-500 focus:outline-none placeholder:text-slate-400 text-slate-800"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="p-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white rounded-xl transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { KeyRound, CheckCircle2, Clock, AlertTriangle, Copy, Check, Monitor, Globe, RefreshCw } from 'lucide-react';

// État renvoyé par l'application desktop (electron/main.cjs → desktop-licence:info).
interface LicenceInfo {
  status: 'activated' | 'trial' | 'expired';
  daysLeft?: number;
  trialEndsAt?: number;
  machineCode: string;
  issuedOn?: string;
  keyHint?: string | null;
  reason?: string;
}

interface DesktopBridge {
  licence: {
    info: () => Promise<LicenceInfo>;
    activate: (key: string) => Promise<{ ok: boolean; error?: string; issuedOn?: string }>;
  };
}

const getBridge = (): DesktopBridge | undefined => (window as any).restopiloteDesktop;

const SUPPORT_PHONE = '+261 34 21 890 51';

export default function LicensePanel() {
  const bridge = getBridge();
  const [info, setInfo] = useState<LicenceInfo | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    if (!bridge) return;
    setInfo(await bridge.licence.info());
  };
  useEffect(() => { refresh(); }, []);

  // Version web (navigateur / Render) : pas de licence.
  if (!bridge) {
    return (
      <div className="p-6">
        <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex gap-3">
          <Globe className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-800">Version en ligne : aucune activation nécessaire.</p>
            <p className="mt-1">La clé d'activation concerne uniquement <b>l'application de bureau RestoPilote (.exe)</b> installée sur un ordinateur. Ouvrez cet onglet depuis l'application de bureau pour voir son état ou saisir une clé.</p>
          </div>
        </div>
      </div>
    );
  }

  const copyCode = async () => {
    if (!info) return;
    try { await navigator.clipboard.writeText(info.machineCode); } catch { /* ignoré */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const activate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) { setMsg({ ok: false, text: "Collez votre clé d'activation." }); return; }
    setBusy(true);
    setMsg(null);
    const res = await bridge.licence.activate(key.trim());
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: 'Activation réussie : RestoPilote est activé sur cet ordinateur.' });
      setKey('');
      refresh();
    } else {
      setMsg({ ok: false, text: res.error || 'Clé invalide.' });
    }
  };

  if (!info) {
    return <div className="p-6 text-sm text-slate-400 flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Chargement de la licence…</div>;
  }

  const endDate = info.trialEndsAt ? new Date(info.trialEndsAt).toLocaleDateString('fr-FR') : null;

  return (
    <div className="p-6 space-y-5">
      {/* État */}
      {info.status === 'activated' && (
        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 flex gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div className="text-sm text-emerald-900">
            <p className="font-bold">RestoPilote est activé sur cet ordinateur.</p>
            <p className="text-xs mt-1 text-emerald-800">
              {info.issuedOn && <>Clé émise le {info.issuedOn.split('-').reverse().join('/')}. </>}
              {info.keyHint && <>Clé : <span className="font-mono">{info.keyHint}</span></>}
            </p>
          </div>
        </div>
      )}
      {info.status === 'trial' && (
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 flex gap-3">
          <Clock className="w-6 h-6 text-blue-600 shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-bold">Version d'essai : {info.daysLeft} jour{(info.daysLeft || 0) > 1 ? 's' : ''} restant{(info.daysLeft || 0) > 1 ? 's' : ''}.</p>
            <p className="text-xs mt-1">{endDate && <>L'essai se termine le {endDate}. </>}Après cette date, une clé sera nécessaire pour ouvrir l'application. Vos données sont conservées.</p>
          </div>
        </div>
      )}
      {info.status === 'expired' && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
          <div className="text-sm text-rose-900">
            <p className="font-bold">La période d'essai est terminée.</p>
            {info.reason && <p className="text-xs mt-1">{info.reason}</p>}
          </div>
        </div>
      )}

      {/* Code machine */}
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5" /> Code machine de cet ordinateur
        </label>
        <div className="mt-1.5 flex gap-2">
          <input readOnly value={info.machineCode}
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-center tracking-widest text-slate-800" />
          <button type="button" onClick={copyCode}
            className="px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer hover:bg-slate-50">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />} {copied ? 'Copié' : 'Copier'}
          </button>
        </div>
      </div>

      {/* Saisie de clé (aussi possible une fois activé : remplacement de clé) */}
      <form onSubmit={activate}>
        <label htmlFor="licence-key" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5" /> {info.status === 'activated' ? 'Remplacer la clé (optionnel)' : "Clé d'activation"}
        </label>
        <textarea id="licence-key" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false}
          placeholder="RP-XXXXXX-XXXXXX-…" rows={3}
          className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-xs resize-none" />
        {msg && <p className={`mt-2 text-xs font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</p>}
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={busy}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60">
            <KeyRound className="w-4 h-4" /> {busy ? 'Vérification…' : 'Activer'}
          </button>
        </div>
      </form>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
        <b>Comment obtenir une clé ?</b> Envoyez le <b>code machine</b> ci-dessus au support RestoPilote ({SUPPORT_PHONE}).
        Vous recevrez une clé valable pour cet ordinateur uniquement : collez-la ici puis cliquez sur « Activer ».
      </div>
    </div>
  );
}

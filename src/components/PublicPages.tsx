import React from 'react';
import {
  ArrowLeft, ShoppingCart, HelpCircle, ShieldCheck, FileText, Scale, Monitor, Globe, CheckCircle2,
  KeyRound, Phone, Download, WifiOff, Printer, Users, Package, Landmark,
} from 'lucide-react';

// Pages publiques (avant connexion) : achat, FAQ, confidentialité, conditions générales, mentions légales.
export type PublicPageId = 'buy' | 'faq' | 'privacy' | 'terms' | 'legal';
export const PUBLIC_PAGE_IDS: PublicPageId[] = ['buy', 'faq', 'privacy', 'terms', 'legal'];

// ⚙️ À PERSONNALISER — informations commerciales et légales de l'éditeur.
// Les champs laissés vides ne sont pas affichés.
const EDITOR = {
  name: 'RestoPilote',
  country: 'Madagascar',
  phone: '+261 34 21 890 51',
  address: '', // ex. « Lot II M 45 Analakely, Antananarivo »
  nif: '',
  stat: '',
};
// Tarifs affichés sur la page « Acheter ». null = « Sur demande ».
const PRICES: { desktop: string | null; online: string | null } = { desktop: null, online: null };
const LAST_UPDATE = '23 novembre 2026';

interface PublicPagesProps {
  page: PublicPageId;
  onBack: () => void;
  onNavigate: (page: PublicPageId | 'contact') => void;
}

const META: Record<PublicPageId, { title: string; subtitle: string; icon: React.ElementType }> = {
  buy: { title: 'Acheter RestoPilote', subtitle: 'Offres & licence', icon: ShoppingCart },
  faq: { title: 'Questions fréquentes', subtitle: 'FAQ', icon: HelpCircle },
  privacy: { title: 'Politique de confidentialité', subtitle: 'Protection des données', icon: ShieldCheck },
  terms: { title: 'Conditions générales', subtitle: 'Vente & utilisation', icon: Scale },
  legal: { title: 'Mentions légales', subtitle: 'Informations éditeur', icon: FileText },
};

// Petits blocs de mise en forme
const H = ({ children }: { children: React.ReactNode }) => <h3 className="font-bold text-slate-800 text-sm mt-5 mb-1.5">{children}</h3>;
const P = ({ children }: { children: React.ReactNode }) => <p className="mb-2">{children}</p>;
const UL = ({ items }: { items: React.ReactNode[] }) => (
  <ul className="space-y-1 mb-2">
    {items.map((it, i) => (
      <li key={i} className="flex gap-2"><span className="text-red-500 mt-0.5">•</span><span>{it}</span></li>
    ))}
  </ul>
);

export default function PublicPages({ page, onBack, onNavigate }: PublicPagesProps) {
  const meta = META[page];
  const Icon = meta.icon;
  const Link = ({ to, children }: { to: PublicPageId | 'contact'; children: React.ReactNode }) => (
    <button type="button" onClick={() => onNavigate(to)} className="text-red-600 font-semibold hover:underline cursor-pointer">{children}</button>
  );

  return (
    <div className="w-full max-w-3xl bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm text-left">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><Icon className="w-5 h-5" /></div>
          <div>
            <h2 className="font-display font-black text-lg text-slate-900">{meta.title}</h2>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{meta.subtitle}</p>
          </div>
        </div>
        <button type="button" onClick={onBack}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Retour
        </button>
      </div>

      <div className="text-xs text-slate-600 leading-relaxed max-h-[62vh] overflow-y-auto pr-2">
        {page === 'buy' && <BuyPage Link={Link} />}
        {page === 'faq' && <FaqPage Link={Link} />}
        {page === 'privacy' && <PrivacyPage Link={Link} />}
        {page === 'terms' && <TermsPage Link={Link} />}
        {page === 'legal' && <LegalPage />}
      </div>

      {/* Navigation entre les pages */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
        {PUBLIC_PAGE_IDS.filter((id) => id !== page).map((id) => {
          const M = META[id];
          const I = M.icon;
          return (
            <button key={id} type="button" onClick={() => onNavigate(id)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-red-600 cursor-pointer flex items-center gap-1.5">
              <I className="w-3.5 h-3.5" /> {M.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type LinkComp = (p: { to: PublicPageId | 'contact'; children: React.ReactNode }) => React.ReactElement;

// ---------------------------------------------------------------- Acheter
function BuyPage({ Link }: { Link: LinkComp }) {
  const features = [
    { icon: Printer, text: 'Tables & additions, ticket de caisse 58 mm / 80 mm / A4 avec NIF et STAT' },
    { icon: Package, text: 'Carte du chef avec fiches techniques, stocks déduits automatiquement à la vente, fournisseurs' },
    { icon: Users, text: 'Personnel, salaires, réservations, livraisons, clients et fidélité' },
    { icon: Landmark, text: 'Finances : chiffre d\'affaires, dépenses, rentrées, amortissement de l\'investissement' },
    { icon: KeyRound, text: 'Plusieurs comptes avec rôles (gérant, comptable, caissier, serveur)' },
  ];
  return (
    <>
      <P>RestoPilote est un logiciel de gestion de restaurant conçu à Madagascar, en Ariary, pour piloter la salle, la cuisine, le stock et les finances au même endroit.</P>
      <div className="grid sm:grid-cols-2 gap-2 my-4">
        {features.map(({ icon: I, text }) => (
          <div key={text} className="flex gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <I className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /><span>{text}</span>
          </div>
        ))}
      </div>

      <H>Nos offres</H>
      <div className="grid sm:grid-cols-2 gap-3 mb-2">
        <div className="p-4 border-2 border-red-500 rounded-2xl bg-red-50/40">
          <div className="flex items-center gap-2 text-red-700 font-bold text-sm"><Monitor className="w-4 h-4" /> Application de bureau</div>
          <p className="text-[10px] text-slate-500 mb-2">Windows 10 / 11</p>
          <UL items={[
            <><WifiOff className="inline w-3 h-3" /> Fonctionne <b>sans Internet</b></>,
            'Données stockées sur votre ordinateur',
            <><b>7 jours d'essai gratuit</b>, sans engagement</>,
            'Licence définitive par ordinateur',
          ]} />
          <p className="mt-2 font-black text-slate-900 text-base">{PRICES.desktop || 'Tarif sur demande'}</p>
        </div>
        <div className="p-4 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm"><Globe className="w-4 h-4" /> Version en ligne</div>
          <p className="text-[10px] text-slate-500 mb-2">Navigateur, ordinateur ou tablette</p>
          <UL items={[
            'Accessible depuis plusieurs appareils',
            'Données hébergées en ligne',
            'Synchronisation en temps réel entre les postes',
            'Connexion Internet nécessaire',
          ]} />
          <p className="mt-2 font-black text-slate-900 text-base">{PRICES.online || 'Tarif sur demande'}</p>
        </div>
      </div>

      <H>Comment acheter ?</H>
      <ol className="space-y-2 mb-2">
        {[
          [Download, <>Installez l'application de bureau et utilisez-la gratuitement pendant <b>7 jours</b>.</>],
          [Phone, <>Contactez-nous ({EDITOR.phone}, appel ou WhatsApp) — voir <Link to="contact">Contact &amp; Support</Link>. Pour l'application de bureau, indiquez le <b>code machine</b> affiché dans Paramètres → Licence &amp; activation.</>],
          [CheckCircle2, <>Nous vous communiquons le tarif et les modalités de paiement.</>],
          [KeyRound, <>Après paiement, vous recevez votre <b>clé d'activation</b> : collez-la dans l'application. Vos données de la période d'essai sont conservées.</>],
        ].map(([I, text], i) => {
          const Ico = I as React.ElementType;
          return (
            <li key={i} className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-red-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
              <span className="pt-0.5"><Ico className="inline w-3.5 h-3.5 text-red-600 mr-1" />{text as React.ReactNode}</span>
            </li>
          );
        })}
      </ol>
      <P>L'achat est soumis aux <Link to="terms">conditions générales</Link>. Des questions ? Consultez la <Link to="faq">FAQ</Link>.</P>
    </>
  );
}

// ---------------------------------------------------------------- FAQ
function FaqPage({ Link }: { Link: LinkComp }) {
  const qa: [string, React.ReactNode][] = [
    ['Puis-je essayer avant d\'acheter ?', 'Oui. L\'application de bureau est utilisable gratuitement pendant 7 jours, avec toutes les fonctionnalités. Ensuite, une clé d\'activation est nécessaire ; vos données sont conservées.'],
    ['Faut-il une connexion Internet ?', 'Non pour l\'application de bureau : elle fonctionne entièrement hors ligne, activation comprise. La version en ligne nécessite une connexion.'],
    ['Où sont stockées mes données ?', <>Avec l'application de bureau, uniquement sur votre ordinateur. Avec la version en ligne, chez nos hébergeurs. Détails dans la <Link to="privacy">politique de confidentialité</Link>.</>],
    ['La licence fonctionne-t-elle sur plusieurs ordinateurs ?', 'Une clé est liée à un seul ordinateur. Pour plusieurs postes, il faut une licence par ordinateur (ou la version en ligne, accessible depuis plusieurs appareils).'],
    ['Je change d\'ordinateur ou je réinstalle Windows : que faire ?', <>Le code machine change : contactez le <Link to="contact">support</Link> avec le nouveau code pour obtenir une nouvelle clé.</>],
    ['Quelles imprimantes sont compatibles ?', 'Les imprimantes thermiques de caisse 58 mm et 80 mm, ainsi que les imprimantes de bureau (format A4). Le format se choisit dans Paramètres.'],
    ['Comment installer une nouvelle version ?', 'Lancez le nouvel installateur par-dessus l\'ancien : vos données et votre activation sont conservées.'],
    ['Comment sauvegarder mes données ?', 'Avec l\'application de bureau fermée, copiez le dossier %APPDATA%\\RestoPilote sur une clé USB ou un disque externe. Nous vous recommandons de le faire régulièrement.'],
    ['Plusieurs employés peuvent-ils utiliser le logiciel ?', 'Oui : chaque employé peut avoir son propre compte avec un rôle (gérant, comptable, chef de caisse, serveur) qui limite les onglets visibles.'],
    ['Le logiciel gère-t-il la TVA ?', 'Oui, un taux de TVA peut être appliqué à chaque addition ; le ticket affiche alors le total HT, la TVA et le total TTC.'],
  ];
  return (
    <div className="space-y-2">
      {qa.map(([q, a]) => (
        <details key={q} className="group border border-slate-100 rounded-xl bg-slate-50/50 open:bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 font-bold text-slate-800 flex justify-between items-center gap-2">
            {q}<span className="text-red-500 text-base group-open:rotate-45 transition-transform">+</span>
          </summary>
          <div className="px-4 pb-3 -mt-1">{a}</div>
        </details>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Confidentialité
function PrivacyPage({ Link }: { Link: LinkComp }) {
  return (
    <>
      <p className="text-[10px] text-slate-400 mb-3">Dernière mise à jour : {LAST_UPDATE}</p>
      <P>Cette politique explique quelles données RestoPilote traite, pourquoi, où elles sont conservées et quels sont vos droits, conformément à la loi malgache n° 2014-038 relative à la protection des données à caractère personnel.</P>

      <H>1. Responsabilités</H>
      <P>{EDITOR.name} est responsable des données liées à votre compte et à votre licence. Le restaurant utilisateur reste responsable des données qu'il saisit dans le logiciel sur ses propres clients, employés et fournisseurs, et de leur usage.</P>

      <H>2. Données traitées</H>
      <UL items={[
        <><b>Compte :</b> nom, adresse e-mail, mot de passe (enregistré uniquement sous forme chiffrée, jamais en clair), rôle.</>,
        <><b>Données de gestion saisies par le restaurant :</b> carte, commandes et additions, stocks, fournisseurs, dépenses et rentrées, personnel (dont salaires), clients et réservations.</>,
        <><b>Licence (application de bureau) :</b> un « code machine », empreinte anonyme de l'ordinateur, ne contenant aucune information personnelle.</>,
      ]} />
      <P>RestoPilote n'utilise ni publicité, ni traceur publicitaire, ni outil d'analyse d'audience.</P>

      <H>3. Où sont stockées les données ?</H>
      <UL items={[
        <><b>Application de bureau :</b> toutes les données restent sur votre ordinateur (dossier %APPDATA%\RestoPilote). Rien n'est envoyé sur Internet.</>,
        <><b>Version en ligne :</b> les données sont hébergées chez nos prestataires techniques (serveur d'application et base de données dans le cloud), dont les serveurs peuvent être situés hors de Madagascar.</>,
      ]} />

      <H>4. Utilisation des données</H>
      <P>Les données servent uniquement à faire fonctionner le logiciel, à délivrer et vérifier les licences, et à vous apporter du support. Elles ne sont jamais vendues ni louées.</P>

      <H>5. Partage</H>
      <P>Les données ne sont partagées qu'avec les hébergeurs de la version en ligne, pour les besoins du service, ou lorsque la loi l'exige.</P>

      <H>6. Sécurité</H>
      <UL items={[
        'Mots de passe chiffrés (hachage bcrypt) et sessions signées.',
        'Connexion chiffrée (HTTPS) pour la version en ligne.',
        'Accès limités par rôle : chaque compte ne voit que les onglets autorisés.',
      ]} />
      <P>Pour l'application de bureau, la sécurité de l'ordinateur et les sauvegardes relèvent du restaurant.</P>

      <H>7. Durée de conservation</H>
      <P>Les données sont conservées tant que le compte est utilisé. Le restaurant peut à tout moment les effacer depuis Paramètres → Zone de danger, ou demander la suppression de son compte en ligne.</P>

      <H>8. Vos droits</H>
      <P>Vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données. Pour l'exercer, contactez-nous via la page <Link to="contact">Contact &amp; Support</Link>.</P>

      <H>9. Modifications</H>
      <P>Cette politique peut évoluer ; la date de mise à jour figure en haut de cette page.</P>
    </>
  );
}

// ---------------------------------------------------------------- Conditions générales
function TermsPage({ Link }: { Link: LinkComp }) {
  return (
    <>
      <p className="text-[10px] text-slate-400 mb-3">Dernière mise à jour : {LAST_UPDATE}</p>
      <H>1. Objet</H>
      <P>Les présentes conditions encadrent la vente et l'utilisation du logiciel RestoPilote (application de bureau et version en ligne). Acheter ou utiliser le logiciel vaut acceptation de ces conditions.</P>

      <H>2. Période d'essai</H>
      <P>L'application de bureau peut être utilisée gratuitement pendant 7 jours à compter de son premier lancement. À l'issue de l'essai, une clé d'activation est nécessaire pour continuer ; les données saisies sont conservées.</P>

      <H>3. Licence d'utilisation</H>
      <UL items={[
        'La licence est personnelle, non exclusive et non cessible.',
        'Une clé d\'activation est valable pour un seul ordinateur (liée à son code machine).',
        'Il est interdit de copier, revendre, louer, modifier, décompiler le logiciel ou de contourner son système d\'activation.',
        'Le logiciel reste la propriété de son éditeur.',
      ]} />

      <H>4. Prix et paiement</H>
      <P>Le tarif est communiqué avant l'achat. La clé d'activation (ou l'accès à la version en ligne) est délivrée après réception du paiement complet.</P>

      <H>5. Livraison</H>
      <P>La clé d'activation est envoyée par message (SMS, WhatsApp ou e-mail). L'activation se fait dans l'application, sans connexion Internet.</P>

      <H>6. Changement d'ordinateur</H>
      <P>En cas de changement d'ordinateur ou de réinstallation de Windows, une nouvelle clé peut être délivrée sur demande auprès du support, sur présentation du nouveau code machine.</P>

      <H>7. Remboursement</H>
      <P>La période d'essai gratuite permettant de tester le logiciel avant l'achat, une licence activée n'est pas remboursable, sauf défaut empêchant son utilisation que le support n'aurait pas pu corriger.</P>

      <H>8. Support et mises à jour</H>
      <P>Le support est assuré du lundi au samedi, de 8h à 18h (heure de Madagascar), via la page <Link to="contact">Contact &amp; Support</Link>. Les nouvelles versions s'installent par-dessus l'ancienne sans perte de données.</P>

      <H>9. Responsabilités</H>
      <UL items={[
        'Le restaurant est responsable des données qu\'il saisit, de leur exactitude et de leurs sauvegardes.',
        'Le restaurant reste responsable de la conformité fiscale et légale de ses factures et de sa comptabilité.',
        'L\'éditeur ne peut être tenu responsable d\'une perte de données due à une panne, un virus ou une mauvaise manipulation de l\'ordinateur.',
      ]} />

      <H>10. Données personnelles</H>
      <P>Voir la <Link to="privacy">politique de confidentialité</Link>.</P>

      <H>11. Droit applicable</H>
      <P>Les présentes conditions sont soumises au droit malgache. En cas de litige, une solution amiable sera recherchée avant toute action en justice.</P>
    </>
  );
}

// ---------------------------------------------------------------- Mentions légales
function LegalPage() {
  const rows: [string, string][] = [
    ['Éditeur', EDITOR.name],
    ['Pays', EDITOR.country],
    ['Adresse', EDITOR.address],
    ['Téléphone', EDITOR.phone],
    ['NIF', EDITOR.nif],
    ['STAT', EDITOR.stat],
  ].filter(([, v]) => v) as [string, string][];
  return (
    <>
      <H>Éditeur du logiciel</H>
      <div className="border border-slate-100 rounded-xl overflow-hidden mb-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex border-b border-slate-100 last:border-0">
            <span className="w-32 shrink-0 px-3 py-2 bg-slate-50 font-semibold text-slate-700">{k}</span>
            <span className="px-3 py-2">{v}</span>
          </div>
        ))}
      </div>
      <P>Pour joindre l'éditeur par e-mail, voir la page Contact &amp; Support.</P>

      <H>Hébergement de la version en ligne</H>
      <P>Serveur d'application : Render (Render Services, Inc., États-Unis). Base de données : Neon (Neon, Inc., États-Unis).</P>

      <H>Propriété intellectuelle</H>
      <P>Le logiciel RestoPilote, son nom, son logo et ses contenus sont protégés. Toute reproduction ou utilisation non autorisée est interdite.</P>
    </>
  );
}

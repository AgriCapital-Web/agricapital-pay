import { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Wallet
} from "lucide-react";
import logoWhite from "@/assets/logo-white.png";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";

interface ClientStatisticsProps {
  souscripteur: any;
  plantations: any[];
  paiements: any[];
  onBack: () => void;
}

const PIE_COLORS = ['#00643C', '#EAB308'];

const ClientStatistics = ({ souscripteur, plantations, paiements, onBack }: ClientStatisticsProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 80);
  }, []);

  const formatMontant = (m: number) => new Intl.NumberFormat("fr-FR").format(m || 0) + " F";

  // Stats par type
  const paiementStats = useMemo(() => {
    const daTotal = paiements.filter(p => p.type_paiement === 'DA' && p.statut === 'valide').reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    const redevanceTotal = paiements.filter(p => p.type_paiement === 'REDEVANCE' && p.statut === 'valide').reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    return [
      { name: "Droits d'Accès", value: daTotal },
      { name: "Redevances",     value: redevanceTotal }
    ].filter(d => d.value > 0);
  }, [paiements]);

  // Évolution mensuelle 12 mois
  const evolutionMensuelle = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const date  = subMonths(new Date(), 11 - i);
      const debut = startOfMonth(date);
      const fin   = endOfMonth(date);
      const moisPaiements = paiements.filter(p => {
        if (!p.date_paiement || p.statut !== 'valide') return false;
        try { return isWithinInterval(parseISO(p.date_paiement), { start: debut, end: fin }); }
        catch { return false; }
      });
      const da       = moisPaiements.filter(p => p.type_paiement === 'DA').reduce((s, p) => s + (p.montant_paye || 0), 0);
      const redevance= moisPaiements.filter(p => p.type_paiement === 'REDEVANCE').reduce((s, p) => s + (p.montant_paye || 0), 0);
      return { mois: format(date, 'MMM yy', { locale: fr }), DA: da, Redevance: redevance, Total: da + redevance };
    });
  }, [paiements]);

  // Arriérés
  const arrieresData = useMemo(() => {
    const TARIF_JOUR = 65;
    return plantations.map(plant => {
      if (!plant.date_activation || plant.statut_global === 'en_attente_da') {
        return { nom: plant.nom_plantation || plant.id_unique, arrieres: 0, enAvance: false, enAttente: true };
      }
      const jours = Math.floor((Date.now() - new Date(plant.date_activation).getTime()) / 86400000);
      const attendu = jours * TARIF_JOUR * (plant.superficie_activee || 0);
      const paye    = paiements.filter(p => p.plantation_id === plant.id && p.type_paiement === 'REDEVANCE' && p.statut === 'valide').reduce((s, p) => s + (p.montant_paye || 0), 0);
      const diff    = attendu - paye;
      if (diff > 0) {
        return { nom: plant.nom_plantation || plant.id_unique, arrieres: diff, joursArrieres: Math.floor(diff / (TARIF_JOUR * (plant.superficie_activee || 1))), enAvance: false, enAttente: false };
      }
      return { nom: plant.nom_plantation || plant.id_unique, arrieres: 0, avance: Math.abs(diff), enAvance: true, enAttente: false };
    });
  }, [plantations, paiements]);

  const totalPaye    = paiements.filter(p => p.statut === 'valide').reduce((s, p) => s + (p.montant_paye || 0), 0);
  const totalArrieres= arrieresData.filter(a => !a.enAvance && !a.enAttente).reduce((s, a) => s + a.arrieres, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
            <span>{entry.name}</span>
            <span className="font-bold">{formatMontant(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-3 max-w-4xl">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logoWhite} alt="AgriCapital" className="h-7 object-contain" />
          <span className="font-semibold text-sm sm:text-base">Mes Statistiques</span>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-5 space-y-4 max-w-4xl">

        {/* RÉSUMÉ CARDS */}
        <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Card className="border-l-4 border-l-primary bg-gradient-to-br from-green-50 to-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-gray-500">Total payé</span>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-primary">{formatMontant(totalPaye)}</p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 overflow-hidden ${totalArrieres > 0 ? 'border-l-red-500 bg-gradient-to-br from-red-50 to-white' : 'border-l-green-500 bg-gradient-to-br from-green-50 to-white'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {totalArrieres > 0 ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                <span className="text-xs text-gray-500">{totalArrieres > 0 ? "Arriérés" : "Statut"}</span>
              </div>
              <p className={`text-xl sm:text-2xl font-bold ${totalArrieres > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {totalArrieres > 0 ? formatMontant(totalArrieres) : "À jour ✓"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* PIE CHART */}
        {paiementStats.length > 0 && (
          <Card className={`transition-all duration-500 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Répartition des paiements
              </CardTitle>
              <CardDescription className="text-xs">Droits d'accès vs Redevances mensuelles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paiementStats}
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paiementStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={10} formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Montants sous le graphe */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                {paiementStats.map((s, i) => (
                  <div key={i} className="text-center p-3 rounded-xl" style={{ background: `${PIE_COLORS[i]}15`, border: `1px solid ${PIE_COLORS[i]}30` }}>
                    <p className="text-xs text-gray-500 mb-0.5">{s.name}</p>
                    <p className="font-bold text-sm" style={{ color: PIE_COLORS[i] }}>{formatMontant(s.value)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AREA CHART */}
        <Card className={`transition-all duration-500 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Évolution mensuelle
            </CardTitle>
            <CardDescription className="text-xs">Historique des 12 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionMensuelle} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradDA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00643C" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00643C" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-[10px] text-gray-600">{v}</span>} />
                  <Area type="monotone" dataKey="DA"        stackId="1" stroke="#00643C" fill="url(#gradDA)"  name="Droits d'Accès" strokeWidth={2} />
                  <Area type="monotone" dataKey="Redevance" stackId="1" stroke="#EAB308" fill="url(#gradRev)" name="Redevances"     strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ÉTAT PAR PLANTATION */}
        {arrieresData.length > 0 && (
          <Card className={`transition-all duration-500 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                {totalArrieres > 0 ? <TrendingDown className="h-4 w-4 text-red-500" /> : <TrendingUp className="h-4 w-4 text-green-500" />}
                État par plantation
              </CardTitle>
              <CardDescription className="text-xs">Arriérés et avances de paiement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {arrieresData.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 sm:p-4 rounded-xl border transition-all hover:shadow-sm ${
                    item.enAttente ? 'bg-gray-50 border-gray-200' :
                    item.enAvance  ? 'bg-green-50 border-green-200' :
                    item.arrieres > 0 ? 'bg-red-50 border-red-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800">{item.nom}</span>
                    {item.enAttente ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        <Wallet className="h-3 w-3" />En attente DA
                      </span>
                    ) : item.enAvance ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle className="h-3 w-3" />En avance : {formatMontant(item.avance || 0)}
                      </span>
                    ) : item.arrieres > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
                        <AlertTriangle className="h-3 w-3" />Arriéré : {formatMontant(item.arrieres)} ({item.joursArrieres}j)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                        <CheckCircle className="h-3 w-3" />À jour
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ClientStatistics;

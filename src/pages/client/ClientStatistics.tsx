import { useMemo } from "react";
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
  BarChart3
} from "lucide-react";
import logoWhite from "@/assets/logo-white.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
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

const COLORS = ['#00643C', '#16a34a', '#22c55e', '#86efac', '#f59e0b', '#ef4444'];

const ClientStatistics = ({ souscripteur, plantations, paiements, onBack }: ClientStatisticsProps) => {
  
  // Calcul des statistiques par type de paiement
  const paiementStats = useMemo(() => {
    const daTotal = paiements
      .filter(p => p.type_paiement === 'DA' && p.statut === 'valide')
      .reduce((sum, p) => sum + (p.montant_paye || 0), 0);
    
    const redevanceTotal = paiements
      .filter(p => p.type_paiement === 'REDEVANCE' && p.statut === 'valide')
      .reduce((sum, p) => sum + (p.montant_paye || 0), 0);

    return [
      { name: "Droits d'Accès (DA)", value: daTotal, fill: '#00643C' },
      { name: "Redevances", value: redevanceTotal, fill: '#16a34a' }
    ];
  }, [paiements]);

  // Évolution mensuelle des paiements (12 derniers mois)
  const evolutionMensuelle = useMemo(() => {
    const data = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const debut = startOfMonth(date);
      const fin = endOfMonth(date);
      
      const paiementsMois = paiements.filter(p => {
        if (!p.date_paiement || p.statut !== 'valide') return false;
        const datePaiement = parseISO(p.date_paiement);
        return isWithinInterval(datePaiement, { start: debut, end: fin });
      });

      const da = paiementsMois
        .filter(p => p.type_paiement === 'DA')
        .reduce((sum, p) => sum + (p.montant_paye || 0), 0);
      
      const redevance = paiementsMois
        .filter(p => p.type_paiement === 'REDEVANCE')
        .reduce((sum, p) => sum + (p.montant_paye || 0), 0);

      data.push({
        mois: format(date, 'MMM yy', { locale: fr }),
        DA: da,
        Redevance: redevance,
        Total: da + redevance
      });
    }
    return data;
  }, [paiements]);

  // Calcul des arriérés par plantation
  const arrieresData = useMemo(() => {
    const TARIF_JOUR = 65; // Tarif par défaut PalmElite
    
    return plantations.map(plant => {
      if (!plant.date_activation || plant.statut_global === 'en_attente_da') {
        return { 
          nom: plant.nom_plantation || plant.id_unique,
          arrieres: 0,
          joursArrieres: 0,
          enAvance: false 
        };
      }
      
      const dateActivation = new Date(plant.date_activation);
      const joursDepuisActivation = Math.floor((new Date().getTime() - dateActivation.getTime()) / (1000 * 60 * 60 * 24));
      const montantAttendu = joursDepuisActivation * TARIF_JOUR * (plant.superficie_activee || 0);
      
      const paiementsContrib = paiements.filter(
        p => p.plantation_id === plant.id && p.type_paiement === 'REDEVANCE' && p.statut === 'valide'
      );
      const montantPaye = paiementsContrib.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
      
      const difference = montantAttendu - montantPaye;
      
      if (difference > 0) {
        const joursArrieres = Math.floor(difference / (TARIF_JOUR * (plant.superficie_activee || 1)));
        return { 
          nom: plant.nom_plantation || plant.id_unique,
          arrieres: difference,
          joursArrieres,
          enAvance: false 
        };
      } else {
        return { 
          nom: plant.nom_plantation || plant.id_unique,
          arrieres: 0,
          avance: Math.abs(difference),
          enAvance: true 
        };
      }
    });
  }, [plantations, paiements]);

  // Stats totales
  const totalPaye = paiements
    .filter(p => p.statut === 'valide')
    .reduce((sum, p) => sum + (p.montant_paye || 0), 0);

  const totalArrieres = arrieresData
    .filter(a => !a.enAvance)
    .reduce((sum, a) => sum + a.arrieres, 0);

  const formatMontant = (m: number) => {
    return new Intl.NumberFormat("fr-FR").format(m) + " F";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-primary text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img src={logoWhite} alt="AgriCapital" className="h-8 object-contain" />
            <span className="font-medium">Mes Statistiques</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
        {/* Résumé */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-primary text-white">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-sm opacity-80">Total payé</span>
              </div>
              <p className="text-2xl font-bold">{formatMontant(totalPaye)}</p>
            </CardContent>
          </Card>
          
          <Card className={totalArrieres > 0 ? "bg-red-500 text-white" : "bg-green-500 text-white"}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                {totalArrieres > 0 ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                <span className="text-sm opacity-80">
                  {totalArrieres > 0 ? "Arriérés" : "Statut"}
                </span>
              </div>
              <p className="text-2xl font-bold">
                {totalArrieres > 0 ? formatMontant(totalArrieres) : "À jour ✓"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Répartition DA vs Redevances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Répartition des paiements
            </CardTitle>
            <CardDescription>Droits d'accès vs Redevances mensuelles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paiementStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => value > 0 ? formatMontant(value) : ''}
                  >
                    {paiementStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatMontant(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Évolution mensuelle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Évolution mensuelle
            </CardTitle>
            <CardDescription>Historique des 12 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolutionMensuelle}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis 
                    tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatMontant(value)}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="DA" 
                    stackId="1"
                    stroke="#00643C" 
                    fill="#00643C"
                    name="Droits d'Accès"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Redevance" 
                    stackId="1"
                    stroke="#16a34a" 
                    fill="#16a34a"
                    name="Redevances"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* État par plantation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {totalArrieres > 0 ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <TrendingUp className="h-5 w-5 text-green-500" />
              )}
              État par plantation
            </CardTitle>
            <CardDescription>Arriérés et avances de paiement</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {arrieresData.map((item, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  item.enAvance 
                    ? 'bg-green-50 border-green-200' 
                    : item.arrieres > 0 
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{item.nom}</span>
                  {item.enAvance ? (
                    <Badge className="bg-green-500">
                      En avance: {formatMontant(item.avance || 0)}
                    </Badge>
                  ) : item.arrieres > 0 ? (
                    <Badge variant="destructive">
                      Arriéré: {formatMontant(item.arrieres)} ({item.joursArrieres}j)
                    </Badge>
                  ) : (
                    <Badge variant="secondary">En attente DA</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientStatistics;

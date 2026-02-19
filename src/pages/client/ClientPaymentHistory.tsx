import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import logoWhite from "@/assets/logo-white.png";
import { 
  ArrowLeft, 
  History, 
  Download,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  TrendingUp,
  CreditCard,
  Wallet
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClientPaymentHistoryProps {
  souscripteur: any;
  plantations: any[];
  paiements: any[];
  onBack: () => void;
}

const ITEMS_PER_PAGE = 10;

const ClientPaymentHistory = ({ souscripteur, plantations, paiements, onBack }: ClientPaymentHistoryProps) => {
  const [visible, setVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterPlantation, setFilterPlantation] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setTimeout(() => setVisible(true), 80);
  }, []);

  const filteredPaiements = useMemo(() => {
    return paiements.filter(p => {
      const matchSearch = searchTerm === "" || 
        p.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.plantations?.nom_plantation?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === "all" || p.type_paiement === filterType;
      const matchStatut = filterStatut === "all" || p.statut === filterStatut;
      const matchPlantation = filterPlantation === "all" || p.plantation_id === filterPlantation;
      return matchSearch && matchType && matchStatut && matchPlantation;
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [paiements, searchTerm, filterType, filterStatut, filterPlantation]);

  const totalPages = Math.ceil(filteredPaiements.length / ITEMS_PER_PAGE);
  const paginatedPaiements = filteredPaiements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const exportCSV = () => {
    const headers = ["Référence", "Date", "Type", "Plantation", "Montant", "Statut", "Mode"];
    const rows = filteredPaiements.map(p => [
      p.reference || "-",
      p.date_paiement ? format(new Date(p.date_paiement), "dd/MM/yyyy HH:mm") : format(new Date(p.created_at), "dd/MM/yyyy HH:mm"),
      p.type_paiement === "DA" ? "Droit d'Accès" : "Redevance mensuelle",
      p.plantations?.nom_plantation || p.plantations?.id_unique || "-",
      p.montant_paye || p.montant,
      p.statut === "valide" ? "Validé" : p.statut === "echec" ? "Échoué" : "En attente",
      p.mode_paiement || "-"
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique-paiements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatMontant = (m: number) => new Intl.NumberFormat("fr-FR").format(m || 0) + " F";

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "valide":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-200"><CheckCircle className="h-3 w-3" />Validé</span>;
      case "echec":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200"><XCircle className="h-3 w-3" />Échoué</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200"><Clock className="h-3 w-3" />En attente</span>;
    }
  };

  const stats = useMemo(() => {
    const totalPaye    = paiements.filter(p => p.statut === "valide").reduce((sum, p) => sum + (p.montant_paye || p.montant || 0), 0);
    const totalDA      = paiements.filter(p => p.type_paiement === "DA"         && p.statut === "valide").reduce((sum, p) => sum + (p.montant_paye || p.montant || 0), 0);
    const totalRedev   = paiements.filter(p => (p.type_paiement === "REDEVANCE" || p.type_paiement === "contribution") && p.statut === "valide").reduce((sum, p) => sum + (p.montant_paye || p.montant || 0), 0);
    return { totalPaye, totalDA, totalRedev, count: paiements.filter(p => p.statut === "valide").length };
  }, [paiements]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-white py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center gap-3 max-w-4xl">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={logoWhite} alt="AgriCapital" className="h-7 object-contain" />
          <span className="font-semibold text-sm sm:text-base">Historique des paiements</span>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-5 space-y-4 max-w-4xl">

        {/* STAT CARDS */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { icon: TrendingUp,  label: "Total payé",        value: formatMontant(stats.totalPaye),  color: "text-primary",   bg: "bg-green-50",  border: "border-green-200" },
            { icon: CreditCard,  label: "Droits d'accès",    value: formatMontant(stats.totalDA),    color: "text-green-700", bg: "bg-green-50",  border: "border-green-200" },
            { icon: Wallet,      label: "Redevances",         value: formatMontant(stats.totalRedev), color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-200" },
            { icon: CheckCircle, label: "Transactions",       value: stats.count,                     color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-200" },
          ].map((s, i) => (
            <Card key={i} className={`border ${s.border} hover:shadow-md transition-shadow`}>
              <CardContent className="p-3 sm:p-4">
                <div className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${s.bg} mb-2`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className={`text-base sm:text-lg font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FILTRES */}
        <Card className={`transition-all duration-500 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Filtres
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV} className="h-8 text-xs gap-1.5">
              <Download className="h-3.5 w-3.5" /> Exporter CSV
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <Select value={filterType} onValueChange={v => { setFilterType(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="DA">Droit d'Accès</SelectItem>
                  <SelectItem value="REDEVANCE">Redevance mensuelle</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatut} onValueChange={v => { setFilterStatut(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="echec">Échoué</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPlantation} onValueChange={v => { setFilterPlantation(v); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Plantation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les plantations</SelectItem>
                  {plantations.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nom_plantation || p.id_unique}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className={`transition-all duration-500 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Transactions
              <Badge variant="secondary" className="ml-auto text-xs">{filteredPaiements.length} résultats</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paginatedPaiements.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Aucun paiement trouvé</p>
                <p className="text-sm mt-1">Modifiez vos filtres pour voir plus de résultats</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y">
                  {paginatedPaiements.map((p) => (
                    <div key={p.id} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {p.date_paiement
                              ? format(new Date(p.date_paiement), "dd/MM/yyyy", { locale: fr })
                              : format(new Date(p.created_at), "dd/MM/yyyy", { locale: fr })}
                          </p>
                          <p className="text-xs font-mono text-gray-300 mt-0.5">{p.reference?.slice(0, 12) || '-'}</p>
                        </div>
                        {getStatutBadge(p.statut)}
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant={p.type_paiement === "DA" ? "default" : "secondary"} className="text-[10px]">
                          {p.type_paiement === "DA" ? "Droit d'Accès" : "Redevance"}
                        </Badge>
                        <span className="font-bold text-primary">{formatMontant(p.montant_paye || p.montant)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Référence</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Plantation</TableHead>
                        <TableHead className="text-right text-xs">Montant</TableHead>
                        <TableHead className="text-xs">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPaiements.map((p) => (
                        <TableRow key={p.id} className="hover:bg-gray-50">
                          <TableCell className="text-xs py-3 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-gray-300" />
                              {p.date_paiement
                                ? format(new Date(p.date_paiement), "dd/MM/yy", { locale: fr })
                                : format(new Date(p.created_at), "dd/MM/yy", { locale: fr })}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-[10px] text-gray-400">{p.reference?.slice(0, 14) || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={p.type_paiement === "DA" ? "default" : "secondary"} className="text-[10px]">
                              {p.type_paiement === "DA" ? "DA" : "Redevance"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-[120px] truncate">
                            {p.plantations?.nom_plantation || p.plantations?.id_unique || "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm text-primary">
                            {formatMontant(p.montant_paye || p.montant)}
                          </TableCell>
                          <TableCell>{getStatutBadge(p.statut)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 border-t bg-gray-50/50">
                    <p className="text-xs text-gray-500">Page {currentPage} / {totalPages}</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8 px-3">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClientPaymentHistory;

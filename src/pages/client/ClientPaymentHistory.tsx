import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Calendar
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatut, setFilterStatut] = useState<string>("all");
  const [filterPlantation, setFilterPlantation] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrer les paiements
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

  // Pagination
  const totalPages = Math.ceil(filteredPaiements.length / ITEMS_PER_PAGE);
  const paginatedPaiements = filteredPaiements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Export CSV
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

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique-paiements-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatMontant = (m: number) => {
    return new Intl.NumberFormat("fr-FR").format(m) + " F";
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case "valide":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" /> Validé
          </Badge>
        );
      case "echec":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" /> Échoué
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" /> En attente
          </Badge>
        );
    }
  };

  // Statistiques
  const stats = useMemo(() => {
    const totalPaye = paiements
      .filter(p => p.statut === "valide")
      .reduce((sum, p) => sum + (p.montant_paye || p.montant || 0), 0);
    
    const totalDA = paiements
      .filter(p => p.type_paiement === "DA" && p.statut === "valide")
      .reduce((sum, p) => sum + (p.montant_paye || p.montant || 0), 0);
    
    const totalRedevances = paiements
      .filter(p => (p.type_paiement === "contribution" || p.type_paiement === "REDEVANCE") && p.statut === "valide")
      .reduce((sum, p) => sum + (p.montant_paye || p.montant || 0), 0);
    
    return { totalPaye, totalDA, totalRedevances, count: paiements.filter(p => p.statut === "valide").length };
  }, [paiements]);

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
            <span className="font-medium">Historique des paiements</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total payé</p>
            <p className="text-lg font-bold text-primary">{formatMontant(stats.totalPaye)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Droits d'accès</p>
            <p className="text-lg font-bold text-green-600">{formatMontant(stats.totalDA)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Redevances mensuelles</p>
            <p className="text-lg font-bold text-blue-600">{formatMontant(stats.totalRedevances)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-bold">{stats.count}</p>
          </Card>
        </div>

        {/* Filtres */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtres
              </CardTitle>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="DA">Droit d'Accès</SelectItem>
                  <SelectItem value="REDEVANCE">Redevance mensuelle</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="echec">Échoué</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPlantation} onValueChange={setFilterPlantation}>
                <SelectTrigger>
                  <SelectValue placeholder="Plantation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les plantations</SelectItem>
                  {plantations.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom_plantation || p.id_unique}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table des paiements */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Transactions ({filteredPaiements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedPaiements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun paiement trouvé</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Plantation</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPaiements.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {p.date_paiement 
                                ? format(new Date(p.date_paiement), "dd/MM/yyyy", { locale: fr })
                                : format(new Date(p.created_at), "dd/MM/yyyy", { locale: fr })
                              }
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.reference?.slice(0, 15) || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.type_paiement === "DA" ? "default" : "secondary"}>
                              {p.type_paiement === "DA" ? "DA" : "Redevance"}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {p.plantations?.nom_plantation || p.plantations?.id_unique || "-"}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatMontant(p.montant_paye || p.montant)}
                          </TableCell>
                          <TableCell>
                            {getStatutBadge(p.statut)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {currentPage} sur {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
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

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import FileUpload from "@/components/ui/file-upload";
import { X } from "lucide-react";
import { usePromotionActive } from "@/hooks/usePromotionActive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PaiementFormProps {
  paiement?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaiementForm = ({ paiement, onSuccess, onCancel }: PaiementFormProps) => {
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: paiement || { type_paiement: "DA" },
  });
  const [souscripteurs, setSouscripteurs] = useState<any[]>([]);
  const [plantations, setPlantations] = useState<any[]>([]);
  const [selectedSouscripteur, setSelectedSouscripteur] = useState<any>(null);
  const [selectedPlantation, setSelectedPlantation] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(paiement?.fichier_preuve_url || "");
  const [filePreview, setFilePreview] = useState("");
  const [arriereInfo, setArriereInfo] = useState<any>(null);
  const [dureeCouverteMessage, setDureeCouverteMessage] = useState("");
  
  const { data: promotionActive } = usePromotionActive();
  const typePaiement = watch("type_paiement");
  const souscripteurId = watch("souscripteur_id");
  const plantationId = watch("plantation_id");
  const typePreuve = watch("type_preuve");
  const montantPaye = watch("montant_paye");

  useEffect(() => {
    fetchSouscripteurs();
  }, []);

  // Quand type de paiement change
  useEffect(() => {
    if (typePaiement) {
      setValue("souscripteur_id", "");
      setValue("plantation_id", "");
      setSelectedSouscripteur(null);
      setSelectedPlantation(null);
      setPlantations([]);
    }
  }, [typePaiement, setValue]);

  // Quand souscripteur change
  useEffect(() => {
    if (souscripteurId) {
      const souscripteur = souscripteurs.find((s) => s.id === souscripteurId);
      setSelectedSouscripteur(souscripteur);
      
      // Si type = CONTRIBUTION, charger plantations du souscripteur
      if (typePaiement === "CONTRIBUTION") {
        fetchPlantationsBySouscripteur(souscripteurId);
      }
      
      // Si type = DA, pas besoin de plantation
      if (typePaiement === "DA") {
        setPlantations([]);
      }
    }
  }, [souscripteurId, typePaiement, souscripteurs]);

  // Quand plantation change (pour CONTRIBUTION)
  useEffect(() => {
    if (plantationId && typePaiement === "CONTRIBUTION") {
      const plantation = plantations.find((p) => p.id === plantationId);
      setSelectedPlantation(plantation);
      
      // Calculer arriérés
      calculerArrieres(plantation);
    }
  }, [plantationId, typePaiement, plantations]);

  // Pour DA: calculer montant automatiquement
  useEffect(() => {
    if (typePaiement === "DA" && souscripteurId) {
      let montantDA = 30000; // Prix normal
      
      if (promotionActive) {
        // Appliquer la réduction en pourcentage
        montantDA = 30000 - (30000 * promotionActive.pourcentage_reduction / 100);
      }
      
      setValue("montant_theorique", montantDA);
    }
  }, [typePaiement, souscripteurId, promotionActive, setValue]);

  // Calculer jours/mois/trimestre pour CONTRIBUTION
  useEffect(() => {
    if (typePaiement === "CONTRIBUTION" && montantPaye) {
      const montant = Number(montantPaye);
      const tauxJournalier = 65;
      const tauxMensuel = 1900;
      const tauxTrimestriel = 5500;
      const tauxAnnuel = 20000;
      
      let message = "";
      
      if (montant === tauxAnnuel) {
        message = "✓ Couvre 1 année (12 mois)";
      } else if (montant === tauxTrimestriel) {
        message = "✓ Couvre 1 trimestre (3 mois)";
      } else if (montant === tauxMensuel) {
        message = "✓ Couvre 1 mois";
      } else if (montant % tauxAnnuel === 0) {
        const annees = montant / tauxAnnuel;
        message = `✓ Couvre ${annees} année${annees > 1 ? 's' : ''}`;
      } else if (montant % tauxTrimestriel === 0) {
        const trimestres = montant / tauxTrimestriel;
        message = `✓ Couvre ${trimestres} trimestre${trimestres > 1 ? 's' : ''}`;
      } else if (montant % tauxMensuel === 0) {
        const mois = montant / tauxMensuel;
        message = `✓ Couvre ${mois} mois`;
      } else if (montant % tauxJournalier === 0) {
        const jours = montant / tauxJournalier;
        message = `✓ Couvre ${jours} jour${jours > 1 ? 's' : ''}`;
      } else {
        message = `⚠️ Le montant doit être un multiple de 65F (taux journalier)`;
      }
      
      setDureeCouverteMessage(message);
    } else {
      setDureeCouverteMessage("");
    }
  }, [montantPaye, typePaiement]);

  const fetchSouscripteurs = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("souscripteurs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSouscripteurs(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const fetchPlantationsBySouscripteur = async (souscripteurId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("plantations")
        .select("*")
        .eq("souscripteur_id", souscripteurId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPlantations(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const calculerArrieres = async (plantation: any) => {
    if (!plantation || !plantation.date_signature_contrat) return;
    
    const dateDebut = new Date(plantation.date_signature_contrat);
    const dateAujourdhui = new Date();
    const diffTime = Math.abs(dateAujourdhui.getTime() - dateDebut.getTime());
    const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const tauxJournalier = 65;
    const montantTheorique = diffJours * tauxJournalier;
    
    // Récupérer les paiements déjà effectués pour cette plantation
    const { data: paiements } = await (supabase as any)
      .from("paiements")
      .select("montant_paye")
      .eq("plantation_id", plantation.id)
      .eq("type_paiement", "CONTRIBUTION")
      .eq("statut", "valide");
    
    const totalPaye = paiements?.reduce((sum: number, p: any) => sum + (p.montant_paye || 0), 0) || 0;
    
    // Calculer le montant actuel s'il y en a un
    const montantActuel = Number(montantPaye) || 0;
    const totalAvecActuel = totalPaye + montantActuel;
    const difference = montantTheorique - totalAvecActuel;
    
    if (difference > 0) {
      // En arriéré
      const joursArrieres = Math.floor(difference / tauxJournalier);
      const moisArrieres = Math.floor(joursArrieres / 29.2);
      
      setArriereInfo({
        type: "arrieres",
        montant: difference,
        jours: joursArrieres,
        message: moisArrieres > 0 
          ? `⚠️ Arriérés: ${difference.toLocaleString()} F (${moisArrieres} mois et ${joursArrieres - (moisArrieres * 29)} jours)`
          : `⚠️ Arriérés: ${difference.toLocaleString()} F (${joursArrieres} jours)`
      });
    } else if (difference < 0) {
      // En avance
      const joursAvance = Math.floor(Math.abs(difference) / tauxJournalier);
      const moisAvance = Math.floor(joursAvance / 29.2);
      const anneesAvance = Math.floor(moisAvance / 12);
      
      let messageAvance = "";
      if (anneesAvance > 0) {
        const moisRestants = moisAvance - (anneesAvance * 12);
        messageAvance = `✓ Avance: ${Math.abs(difference).toLocaleString()} F (${anneesAvance} an${anneesAvance > 1 ? 's' : ''} et ${moisRestants} mois)`;
      } else if (moisAvance > 0) {
        const joursRestants = joursAvance - (moisAvance * 29);
        messageAvance = `✓ Avance: ${Math.abs(difference).toLocaleString()} F (${moisAvance} mois et ${joursRestants} jours)`;
      } else {
        messageAvance = `✓ Avance: ${Math.abs(difference).toLocaleString()} F (${joursAvance} jours)`;
      }
      
      setArriereInfo({
        type: "avance",
        montant: Math.abs(difference),
        jours: joursAvance,
        message: messageAvance
      });
    } else {
      setArriereInfo({
        type: "ok",
        message: "✓ Paiement à jour"
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      
      // Prévisualisation pour les images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(file.name);
      }
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `paiements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents-fonciers")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents-fonciers")
        .getPublicUrl(filePath);

      setFileUrl(publicUrl);
      setValue("fichier_preuve_url", publicUrl);
      
      toast({
        title: "Succès",
        description: "Fichier téléchargé avec succès",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const user = await supabase.auth.getUser();
      
      const paiementData = {
        ...data,
        created_by: user.data.user?.id,
        statut: "en_attente",
        date_upload_preuve: new Date().toISOString(),
      };

      if (paiement) {
        const { error } = await (supabase as any)
          .from("paiements")
          .update(paiementData)
          .eq("id", paiement.id);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("paiements")
          .insert([paiementData]);

        if (error) throw error;
      }

      toast({
        title: "Succès",
        description: `Paiement ${paiement ? "modifié" : "créé"} avec succès`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message,
      });
    }
  };

  const montantCalculeDA = souscripteurId && typePaiement === "DA" 
    ? (promotionActive ? 30000 - (30000 * promotionActive.pourcentage_reduction / 100) : 30000)
    : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* TYPE DE PAIEMENT EN PREMIER */}
        <div>
          <Label htmlFor="type_paiement">Type de Paiement *</Label>
          <Select
            onValueChange={(value) => setValue("type_paiement", value)}
            defaultValue={paiement?.type_paiement || "DA"}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type de paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DA">Droit d'Accès (DA)</SelectItem>
              <SelectItem value="CONTRIBUTION">Contribution Annuelle</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SOUSCRIPTEUR (PLANTEUR) */}
        {typePaiement && (
          <div>
            <Label htmlFor="souscripteur_id">Planteur *</Label>
            <Select
              onValueChange={(value) => setValue("souscripteur_id", value)}
              defaultValue={paiement?.souscripteur_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un planteur" />
              </SelectTrigger>
              <SelectContent>
                {souscripteurs.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.id_unique} - {s.nom_complet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* PLANTATION (seulement pour CONTRIBUTION) */}
        {typePaiement === "CONTRIBUTION" && souscripteurId && (
          <div>
            <Label htmlFor="plantation_id">Plantation *</Label>
            <Select
              onValueChange={(value) => setValue("plantation_id", value)}
              defaultValue={paiement?.plantation_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une plantation" />
              </SelectTrigger>
              <SelectContent>
                {plantations.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.id_unique} - {p.nom_plantation} ({p.superficie_ha} ha)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* CARTE CALCUL DA */}
        {montantCalculeDA && typePaiement === "DA" && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                💰 Calcul Droit d'Accès
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {promotionActive && (
                <div className="flex items-center gap-2 text-green-600">
                  <Badge variant="outline" className="bg-green-50">
                    🎉 PROMO ACTIVE
                  </Badge>
                  <span>{promotionActive.nom} (-{promotionActive.pourcentage_reduction}%)</span>
                </div>
              )}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Montant unitaire:</span>
                  <span className="font-medium">
                    {montantCalculeDA.toLocaleString()} F
                  </span>
                </div>
                {promotionActive && (
                  <div className="flex justify-between text-green-600">
                    <span>Économie:</span>
                    <span className="font-bold">
                      {(30000 - montantCalculeDA).toLocaleString()} F
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t text-lg font-bold">
                  <span>MONTANT À PAYER:</span>
                  <span>{montantCalculeDA.toLocaleString()} F</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MONTANT (DA uniquement - lecture seule) */}
        {typePaiement === "DA" && souscripteurId && (
          <div>
            <Label htmlFor="montant_theorique">Montant Droit d'Accès (F CFA) *</Label>
            <Input
              type="number"
              {...register("montant_theorique", { required: true })}
              readOnly
              className="bg-muted font-bold text-lg"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le DA complet est obligatoire (pas de paiement partiel)
            </p>
          </div>
        )}

        {/* ARRIERES INFO (CONTRIBUTION) */}
        {typePaiement === "CONTRIBUTION" && arriereInfo && (
          <Card className={
            arriereInfo.type === "arrieres" 
              ? "bg-red-50 border-red-200" 
              : arriereInfo.type === "avance" 
                ? "bg-green-50 border-green-200" 
                : "bg-blue-50 border-blue-200"
          }>
            <CardContent className="pt-4">
              <p className="text-sm font-medium">{arriereInfo.message}</p>
              {arriereInfo.type === "arrieres" && (
                <p className="text-xs text-red-600 mt-2">
                  Montant dû: {arriereInfo.montant.toLocaleString()} F
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* MONTANT PAYE (CONTRIBUTION uniquement) */}
        {typePaiement === "CONTRIBUTION" && selectedPlantation && (
          <div>
            <Label htmlFor="montant_paye">Montant Payé (F CFA) *</Label>
            <Input
              type="number"
              {...register("montant_paye", { 
                required: true,
                onChange: (e) => {
                  const value = Number(e.target.value);
                  setValue("montant_paye", value);
                  if (selectedPlantation) {
                    calculerArrieres(selectedPlantation);
                  }
                }
              })}
              placeholder="Saisir montant (minimum 65F)"
              min="65"
              step="65"
            />
            {dureeCouverteMessage && (
              <p className="text-xs mt-2 text-primary font-medium">
                {dureeCouverteMessage}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Taux: 65F/jour • 1 900F/mois • 5 500F/trimestre • 20 000F/année
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="date_paiement">Date de Paiement *</Label>
          <Input type="date" {...register("date_paiement", { required: true })} />
        </div>

        <div>
          <Label htmlFor="annee">Année *</Label>
          <Input
            type="number"
            {...register("annee", { required: true })}
            defaultValue={new Date().getFullYear()}
          />
        </div>

        <div>
          <Label htmlFor="mode_paiement">Mode de Paiement *</Label>
          <Select
            onValueChange={(value) => setValue("mode_paiement", value)}
            defaultValue={paiement?.mode_paiement}
          >
            <SelectTrigger>
              <SelectValue placeholder="Mode de paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="virement">Virement bancaire</SelectItem>
              <SelectItem value="cheque">Chèque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="type_preuve">Type de Preuve *</Label>
          <Select
            onValueChange={(value) => setValue("type_preuve", value)}
            defaultValue={paiement?.type_preuve}
          >
            <SelectTrigger>
              <SelectValue placeholder="Type de preuve" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id_transaction">ID Transaction (Mobile Money)</SelectItem>
              <SelectItem value="photo_recu">Photo Reçu</SelectItem>
              <SelectItem value="pdf_document">Document PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {typePreuve === "id_transaction" && (
          <>
            <div>
              <Label htmlFor="id_transaction">ID Transaction *</Label>
              <Input
                {...register("id_transaction")}
                placeholder="Ex: OM2510156789"
              />
            </div>
            <div>
              <Label htmlFor="operateur_mobile_money">Opérateur *</Label>
              <Select
                onValueChange={(value) => setValue("operateur_mobile_money", value)}
                defaultValue={paiement?.operateur_mobile_money}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opérateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="orange_money">Orange Money</SelectItem>
                  <SelectItem value="mtn_money">MTN Money</SelectItem>
                  <SelectItem value="moov_money">Moov Money</SelectItem>
                  <SelectItem value="wave">Wave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {(typePreuve === "photo_recu" || typePreuve === "pdf_document") && (
          <div>
            <Label>Fichier de Preuve *</Label>
            <FileUpload
              onFileSelect={handleFileUpload}
              accept={typePreuve === "pdf_document" ? ".pdf" : "image/*"}
              maxSize={10}
            />
            {filePreview && (
              <div className="mt-3">
                {filePreview.startsWith('data:image') ? (
                  <div className="relative">
                    <img src={filePreview} alt="Aperçu" className="w-full h-48 object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => {
                        setFilePreview("");
                        setFileUrl("");
                        setValue("fichier_preuve_url", "");
                      }}
                      className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full hover:bg-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded border text-sm flex items-center justify-between">
                    <span>📄 {filePreview}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilePreview("");
                        setFileUrl("");
                        setValue("fichier_preuve_url", "");
                      }}
                      className="p-1 bg-destructive text-white rounded-full hover:bg-destructive/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <Label htmlFor="observations">Observations</Label>
          <Textarea 
            {...register("observations")} 
            rows={3} 
            placeholder="Ajouter des notes supplémentaires..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={uploading}>
          {uploading ? "Chargement..." : paiement ? "Modifier" : "Enregistrer"}
        </Button>
      </div>
    </form>
  );
};

export default PaiementForm;

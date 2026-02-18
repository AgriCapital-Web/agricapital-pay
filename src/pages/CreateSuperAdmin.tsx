import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle, Shield } from "lucide-react";
import logoGreen from "@/assets/logo-green.png";

const CreateSuperAdmin = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const superAdminData = {
    username: 'admin',
    email: 'admin@agricapital.ci',
    password: '@AgriCapitaladmin',
    nom_complet: 'KOFFI Inocent',
    telephone: '0759566087',
    photo_url: `${window.location.origin}/images/admin-koffi-inocent.jpg`
  };

  const createSuperAdmin = async () => {
    setIsCreating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-super-admin', {
        body: superAdminData
      });

      if (error) throw error;

      setIsSuccess(true);
      toast({
        title: "Succès",
        description: data?.message || "Compte super admin créé/mis à jour avec succès !",
      });

      console.log('Super admin créé:', data);
    } catch (error: any) {
      console.error('Erreur:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer le compte",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-accent/30 p-3 sm:p-4">
      <Card className="w-full max-w-[95%] sm:max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={logoGreen} alt="AgriCapital" className="h-20 w-auto" />
          </div>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Shield className="h-6 w-6 text-primary" />
            Initialisation AgriCapital
          </CardTitle>
          <CardDescription className="text-base">
            Créer le compte super administrateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSuccess ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-green-700">Compte créé avec succès !</p>
                <p className="text-sm text-muted-foreground">
                  Vous pouvez maintenant vous connecter avec vos identifiants.
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm"><strong>Nom d'utilisateur:</strong> {superAdminData.username}</p>
                <p className="text-sm"><strong>Mot de passe:</strong> {superAdminData.password}</p>
              </div>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Aller à la page de connexion
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Informations du compte
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nom d'utilisateur:</span>
                    <span className="font-medium">{superAdminData.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{superAdminData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mot de passe:</span>
                    <span className="font-medium font-mono">{superAdminData.password}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nom complet:</span>
                    <span className="font-medium">{superAdminData.nom_complet}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Téléphone:</span>
                    <span className="font-medium">{superAdminData.telephone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rôle:</span>
                    <span className="font-medium text-primary">Super Administrateur</span>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={createSuperAdmin}
                disabled={isCreating}
                className="w-full h-12 text-lg"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Créer / Réinitialiser Super Admin
                  </>
                )}
              </Button>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">
                  <strong>Important:</strong> Changez le mot de passe immédiatement après la première connexion pour des raisons de sécurité.
                </p>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Cette page sert uniquement à l'initialisation du système.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateSuperAdmin;

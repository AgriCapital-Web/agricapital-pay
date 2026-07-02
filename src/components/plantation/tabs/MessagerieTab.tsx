import { EmptyState } from "../EmptyState";
import { MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";

export const MessagerieTab = ({ souscripteur }: { souscripteur: any }) => {
  const commercial = souscripteur?.commercial;
  return (
    <div className="space-y-3">
      <EmptyState
        icon={MessageSquare}
        title="Messagerie bientôt disponible"
        description="Vous pourrez échanger directement avec le support AgriCapital, votre technicien et votre commercial dès l'ouverture du module."
      />
      {commercial?.telephone && (
        <Card className="card-brand-subtle rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">En attendant, contactez :</p>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{commercial.nom}</p>
                <p className="text-xs text-muted-foreground">{commercial.fonction || "Conseiller"}</p>
              </div>
              <Button asChild size="sm" className="btn-brand">
                <a href={`https://wa.me/225${commercial.telephone.replace(/\D/g, "").replace(/^225/, "")}`} target="_blank" rel="noreferrer">
                  <Phone className="h-3.5 w-3.5 mr-1" /> WhatsApp
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

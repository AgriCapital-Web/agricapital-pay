import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "../EmptyState";
import { FileBarChart2, Download } from "lucide-react";

export const RapportsTab = ({ plantation }: { plantation: any }) => {
  const rapports: any[] = plantation?.rapports || [];
  if (rapports.length === 0) {
    return <EmptyState icon={FileBarChart2} title="Aucun rapport pour l'instant" description="Vos rapports mensuels, trimestriels et annuels (travaux, photos, vidéos, observations, recommandations) seront disponibles ici." />;
  }
  return (
    <div className="space-y-2">
      {rapports.map((r, i) => (
        <Card key={i} className="rounded-xl">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
              <FileBarChart2 className="h-5 w-5 text-gold-dark" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{r.titre || "Rapport"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[9px]">{r.periodicite || "mensuel"}</Badge>
                <span className="text-[10px] text-muted-foreground">{r.periode || ""}</span>
              </div>
            </div>
            {r.url && (
              <Button asChild size="sm" variant="outline" className="h-8">
                <a href={r.url} target="_blank" rel="noreferrer"><Download className="h-3.5 w-3.5" /></a>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

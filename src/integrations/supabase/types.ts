export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_requests: {
        Row: {
          created_at: string | null
          cv_url: string | null
          departement: string | null
          departement_geo_id: string | null
          district_id: string | null
          email: string
          id: string
          justification: string | null
          motif_rejet: string | null
          nom_complet: string
          photo_url: string | null
          poste_souhaite: string | null
          region_id: string | null
          role_souhaite: string
          statut: string | null
          telephone: string
          traite_le: string | null
          traite_par: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cv_url?: string | null
          departement?: string | null
          departement_geo_id?: string | null
          district_id?: string | null
          email: string
          id?: string
          justification?: string | null
          motif_rejet?: string | null
          nom_complet: string
          photo_url?: string | null
          poste_souhaite?: string | null
          region_id?: string | null
          role_souhaite: string
          statut?: string | null
          telephone: string
          traite_le?: string | null
          traite_par?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cv_url?: string | null
          departement?: string | null
          departement_geo_id?: string | null
          district_id?: string | null
          email?: string
          id?: string
          justification?: string | null
          motif_rejet?: string | null
          nom_complet?: string
          photo_url?: string | null
          poste_souhaite?: string | null
          region_id?: string | null
          role_souhaite?: string
          statut?: string | null
          telephone?: string
          traite_le?: string | null
          traite_par?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_requests_departement_geo_id_fkey"
            columns: ["departement_geo_id"]
            isOneToOne: false
            referencedRelation: "departements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_requests_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_requests_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_notes: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          created_at: string | null
          date_calcul: string | null
          date_validation: string | null
          id: string
          montant_base: number | null
          montant_commission: number | null
          periode: string | null
          plantation_id: string | null
          profile_id: string | null
          statut: string | null
          taux_commission: number | null
          type_commission: string
          valide_par: string | null
        }
        Insert: {
          created_at?: string | null
          date_calcul?: string | null
          date_validation?: string | null
          id?: string
          montant_base?: number | null
          montant_commission?: number | null
          periode?: string | null
          plantation_id?: string | null
          profile_id?: string | null
          statut?: string | null
          taux_commission?: number | null
          type_commission: string
          valide_par?: string | null
        }
        Update: {
          created_at?: string | null
          date_calcul?: string | null
          date_validation?: string | null
          id?: string
          montant_base?: number | null
          montant_commission?: number | null
          periode?: string | null
          plantation_id?: string | null
          profile_id?: string | null
          statut?: string | null
          taux_commission?: number | null
          type_commission?: string
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_plantation_id_fkey"
            columns: ["plantation_id"]
            isOneToOne: false
            referencedRelation: "plantations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departements: {
        Row: {
          code: string | null
          created_at: string | null
          est_actif: boolean | null
          id: string
          nom: string
          region_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          est_actif?: boolean | null
          id?: string
          nom: string
          region_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          est_actif?: boolean | null
          id?: string
          nom?: string
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departements_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      districts: {
        Row: {
          code: string | null
          created_at: string | null
          est_actif: boolean | null
          id: string
          nom: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          est_actif?: boolean | null
          id?: string
          nom: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          est_actif?: boolean | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      equipes: {
        Row: {
          actif: boolean | null
          created_at: string | null
          id: string
          nom: string
          region_id: string | null
          responsable_id: string | null
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          nom: string
          region_id?: string | null
          responsable_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          nom?: string
          region_id?: string | null
          responsable_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipes_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipes_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historique_activites: {
        Row: {
          action: string
          ancien_valeurs: Json | null
          created_at: string | null
          details: string | null
          id: string
          ip_address: string | null
          nouvelles_valeurs: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          ancien_valeurs?: Json | null
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          nouvelles_valeurs?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          ancien_valeurs?: Json | null
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          nouvelles_valeurs?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      offres: {
        Row: {
          actif: boolean | null
          avantages: Json | null
          code: string
          contribution_mensuelle_par_ha: number
          couleur: string | null
          created_at: string | null
          description: string | null
          id: string
          montant_da_par_ha: number
          nom: string
          ordre: number | null
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          avantages?: Json | null
          code: string
          contribution_mensuelle_par_ha?: number
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          montant_da_par_ha?: number
          nom: string
          ordre?: number | null
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          avantages?: Json | null
          code?: string
          contribution_mensuelle_par_ha?: number
          couleur?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          montant_da_par_ha?: number
          nom?: string
          ordre?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      paiements: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_echeance: string | null
          date_paiement: string | null
          date_validation: string | null
          id: string
          metadata: Json | null
          mode_paiement: string | null
          montant: number
          montant_paye: number | null
          notes: string | null
          plantation_id: string | null
          preuve_paiement_url: string | null
          reference: string | null
          souscripteur_id: string | null
          statut: string | null
          type_paiement: string | null
          updated_at: string | null
          valide_par: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_echeance?: string | null
          date_paiement?: string | null
          date_validation?: string | null
          id?: string
          metadata?: Json | null
          mode_paiement?: string | null
          montant?: number
          montant_paye?: number | null
          notes?: string | null
          plantation_id?: string | null
          preuve_paiement_url?: string | null
          reference?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          type_paiement?: string | null
          updated_at?: string | null
          valide_par?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_echeance?: string | null
          date_paiement?: string | null
          date_validation?: string | null
          id?: string
          metadata?: Json | null
          mode_paiement?: string | null
          montant?: number
          montant_paye?: number | null
          notes?: string | null
          plantation_id?: string | null
          preuve_paiement_url?: string | null
          reference?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          type_paiement?: string | null
          updated_at?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paiements_plantation_id_fkey"
            columns: ["plantation_id"]
            isOneToOne: false
            referencedRelation: "plantations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paiements_souscripteur_id_fkey"
            columns: ["souscripteur_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      plantations: {
        Row: {
          age_plants: number | null
          alerte_non_paiement: boolean | null
          alerte_visite_retard: boolean | null
          created_at: string | null
          created_by: string | null
          date_activation: string | null
          date_plantation: string | null
          densite_plants: number | null
          departement_id: string | null
          derniere_visite: string | null
          district_id: string | null
          id: string
          id_unique: string | null
          localisation_gps_lat: number | null
          localisation_gps_lng: number | null
          montant_contribution_mensuelle: number | null
          montant_da: number | null
          montant_da_paye: number | null
          nom: string | null
          nom_plantation: string | null
          nombre_plants: number | null
          notes: string | null
          polygone_gps: Json | null
          prochaine_visite: string | null
          region_id: string | null
          sous_prefecture_id: string | null
          souscripteur_id: string | null
          statut: string | null
          statut_global: string | null
          superficie_activee: number | null
          superficie_ha: number | null
          updated_at: string | null
          updated_by: string | null
          variete: string | null
          village: string | null
        }
        Insert: {
          age_plants?: number | null
          alerte_non_paiement?: boolean | null
          alerte_visite_retard?: boolean | null
          created_at?: string | null
          created_by?: string | null
          date_activation?: string | null
          date_plantation?: string | null
          densite_plants?: number | null
          departement_id?: string | null
          derniere_visite?: string | null
          district_id?: string | null
          id?: string
          id_unique?: string | null
          localisation_gps_lat?: number | null
          localisation_gps_lng?: number | null
          montant_contribution_mensuelle?: number | null
          montant_da?: number | null
          montant_da_paye?: number | null
          nom?: string | null
          nom_plantation?: string | null
          nombre_plants?: number | null
          notes?: string | null
          polygone_gps?: Json | null
          prochaine_visite?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          statut_global?: string | null
          superficie_activee?: number | null
          superficie_ha?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variete?: string | null
          village?: string | null
        }
        Update: {
          age_plants?: number | null
          alerte_non_paiement?: boolean | null
          alerte_visite_retard?: boolean | null
          created_at?: string | null
          created_by?: string | null
          date_activation?: string | null
          date_plantation?: string | null
          densite_plants?: number | null
          departement_id?: string | null
          derniere_visite?: string | null
          district_id?: string | null
          id?: string
          id_unique?: string | null
          localisation_gps_lat?: number | null
          localisation_gps_lng?: number | null
          montant_contribution_mensuelle?: number | null
          montant_da?: number | null
          montant_da_paye?: number | null
          nom?: string | null
          nom_plantation?: string | null
          nombre_plants?: number | null
          notes?: string | null
          polygone_gps?: Json | null
          prochaine_visite?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          statut_global?: string | null
          superficie_activee?: number | null
          superficie_ha?: number | null
          updated_at?: string | null
          updated_by?: string | null
          variete?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantations_departement_id_fkey"
            columns: ["departement_id"]
            isOneToOne: false
            referencedRelation: "departements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantations_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantations_sous_prefecture_id_fkey"
            columns: ["sous_prefecture_id"]
            isOneToOne: false
            referencedRelation: "sous_prefectures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plantations_souscripteur_id_fkey"
            columns: ["souscripteur_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      portefeuilles: {
        Row: {
          created_at: string | null
          dernier_versement_date: string | null
          dernier_versement_montant: number | null
          id: string
          solde_commissions: number | null
          total_gagne: number | null
          total_retire: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dernier_versement_date?: string | null
          dernier_versement_montant?: number | null
          id?: string
          solde_commissions?: number | null
          total_gagne?: number | null
          total_retire?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dernier_versement_date?: string | null
          dernier_versement_montant?: number | null
          id?: string
          solde_commissions?: number | null
          total_gagne?: number | null
          total_retire?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          actif: boolean | null
          created_at: string | null
          email: string | null
          equipe_id: string | null
          id: string
          nom_complet: string
          photo_url: string | null
          telephone: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          email?: string | null
          equipe_id?: string | null
          id?: string
          nom_complet: string
          photo_url?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          email?: string | null
          equipe_id?: string | null
          id?: string
          nom_complet?: string
          photo_url?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_equipe"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean | null
          applique_toutes_offres: boolean | null
          created_at: string | null
          date_debut: string
          date_fin: string
          description: string | null
          id: string
          nom: string
          offre_ids: Json | null
          pourcentage_reduction: number
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          applique_toutes_offres?: boolean | null
          created_at?: string | null
          date_debut: string
          date_fin: string
          description?: string | null
          id?: string
          nom: string
          offre_ids?: Json | null
          pourcentage_reduction?: number
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          applique_toutes_offres?: boolean | null
          created_at?: string | null
          date_debut?: string
          date_fin?: string
          description?: string | null
          id?: string
          nom?: string
          offre_ids?: Json | null
          pourcentage_reduction?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string | null
          created_at: string | null
          district_id: string | null
          est_active: boolean | null
          id: string
          nom: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          district_id?: string | null
          est_active?: boolean | null
          id?: string
          nom: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          district_id?: string | null
          est_active?: boolean | null
          id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
        ]
      }
      remboursements: {
        Row: {
          created_at: string | null
          date_traitement: string | null
          id: string
          mode_remboursement: string | null
          montant: number
          motif: string | null
          numero_compte: string | null
          paiement_id: string | null
          souscripteur_id: string | null
          statut: string | null
          traite_par: string | null
        }
        Insert: {
          created_at?: string | null
          date_traitement?: string | null
          id?: string
          mode_remboursement?: string | null
          montant: number
          motif?: string | null
          numero_compte?: string | null
          paiement_id?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          traite_par?: string | null
        }
        Update: {
          created_at?: string | null
          date_traitement?: string | null
          id?: string
          mode_remboursement?: string | null
          montant?: number
          motif?: string | null
          numero_compte?: string | null
          paiement_id?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          traite_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remboursements_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remboursements_souscripteur_id_fkey"
            columns: ["souscripteur_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      retraits_portefeuille: {
        Row: {
          created_at: string | null
          date_demande: string | null
          date_traitement: string | null
          id: string
          mode_paiement: string | null
          montant: number
          numero_compte: string | null
          portefeuille_id: string | null
          statut: string | null
          traite_par: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_demande?: string | null
          date_traitement?: string | null
          id?: string
          mode_paiement?: string | null
          montant: number
          numero_compte?: string | null
          portefeuille_id?: string | null
          statut?: string | null
          traite_par?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_demande?: string | null
          date_traitement?: string | null
          id?: string
          mode_paiement?: string | null
          montant?: number
          numero_compte?: string | null
          portefeuille_id?: string | null
          statut?: string | null
          traite_par?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retraits_portefeuille_portefeuille_id_fkey"
            columns: ["portefeuille_id"]
            isOneToOne: false
            referencedRelation: "portefeuilles"
            referencedColumns: ["id"]
          },
        ]
      }
      sous_prefectures: {
        Row: {
          code: string | null
          created_at: string | null
          departement_id: string | null
          est_active: boolean | null
          id: string
          nom: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          departement_id?: string | null
          est_active?: boolean | null
          id?: string
          nom: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          departement_id?: string | null
          est_active?: boolean | null
          id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "sous_prefectures_departement_id_fkey"
            columns: ["departement_id"]
            isOneToOne: false
            referencedRelation: "departements"
            referencedColumns: ["id"]
          },
        ]
      }
      souscripteurs: {
        Row: {
          banque_operateur: string | null
          civilite: string | null
          created_at: string | null
          created_by: string | null
          date_delivrance_piece: string | null
          date_naissance: string | null
          departement_id: string | null
          district_id: string | null
          domicile: string | null
          domicile_residence: string | null
          email: string | null
          fichier_piece_recto_url: string | null
          fichier_piece_url: string | null
          fichier_piece_verso_url: string | null
          id: string
          id_unique: string | null
          lieu_naissance: string | null
          nom: string | null
          nom_complet: string | null
          nom_famille: string | null
          nom_titulaire_compte: string | null
          nombre_plantations: number | null
          numero_compte: string | null
          numero_piece: string | null
          offre_id: string | null
          photo_profil_url: string | null
          prenoms: string | null
          region_id: string | null
          sous_prefecture_id: string | null
          statut: string | null
          statut_global: string | null
          statut_marital: string | null
          telephone: string
          total_hectares: number | null
          type_compte: string | null
          type_piece: string | null
          updated_at: string | null
          updated_by: string | null
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          banque_operateur?: string | null
          civilite?: string | null
          created_at?: string | null
          created_by?: string | null
          date_delivrance_piece?: string | null
          date_naissance?: string | null
          departement_id?: string | null
          district_id?: string | null
          domicile?: string | null
          domicile_residence?: string | null
          email?: string | null
          fichier_piece_recto_url?: string | null
          fichier_piece_url?: string | null
          fichier_piece_verso_url?: string | null
          id?: string
          id_unique?: string | null
          lieu_naissance?: string | null
          nom?: string | null
          nom_complet?: string | null
          nom_famille?: string | null
          nom_titulaire_compte?: string | null
          nombre_plantations?: number | null
          numero_compte?: string | null
          numero_piece?: string | null
          offre_id?: string | null
          photo_profil_url?: string | null
          prenoms?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          statut?: string | null
          statut_global?: string | null
          statut_marital?: string | null
          telephone: string
          total_hectares?: number | null
          type_compte?: string | null
          type_piece?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          banque_operateur?: string | null
          civilite?: string | null
          created_at?: string | null
          created_by?: string | null
          date_delivrance_piece?: string | null
          date_naissance?: string | null
          departement_id?: string | null
          district_id?: string | null
          domicile?: string | null
          domicile_residence?: string | null
          email?: string | null
          fichier_piece_recto_url?: string | null
          fichier_piece_url?: string | null
          fichier_piece_verso_url?: string | null
          id?: string
          id_unique?: string | null
          lieu_naissance?: string | null
          nom?: string | null
          nom_complet?: string | null
          nom_famille?: string | null
          nom_titulaire_compte?: string | null
          nombre_plantations?: number | null
          numero_compte?: string | null
          numero_piece?: string | null
          offre_id?: string | null
          photo_profil_url?: string | null
          prenoms?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          statut?: string | null
          statut_global?: string | null
          statut_marital?: string | null
          telephone?: string
          total_hectares?: number | null
          type_compte?: string | null
          type_piece?: string | null
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "souscripteurs_departement_id_fkey"
            columns: ["departement_id"]
            isOneToOne: false
            referencedRelation: "departements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "souscripteurs_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "souscripteurs_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "souscripteurs_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "souscripteurs_sous_prefecture_id_fkey"
            columns: ["sous_prefecture_id"]
            isOneToOne: false
            referencedRelation: "sous_prefectures"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets_techniques: {
        Row: {
          assigne_a: string | null
          created_at: string | null
          cree_par: string | null
          date_resolution: string | null
          description: string | null
          id: string
          plantation_id: string | null
          priorite: string | null
          statut: string | null
          titre: string
          updated_at: string | null
        }
        Insert: {
          assigne_a?: string | null
          created_at?: string | null
          cree_par?: string | null
          date_resolution?: string | null
          description?: string | null
          id?: string
          plantation_id?: string | null
          priorite?: string | null
          statut?: string | null
          titre: string
          updated_at?: string | null
        }
        Update: {
          assigne_a?: string | null
          created_at?: string | null
          cree_par?: string | null
          date_resolution?: string | null
          description?: string | null
          id?: string
          plantation_id?: string | null
          priorite?: string | null
          statut?: string | null
          titre?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_techniques_plantation_id_fkey"
            columns: ["plantation_id"]
            isOneToOne: false
            referencedRelation: "plantations"
            referencedColumns: ["id"]
          },
        ]
      }
      transferts_paiements: {
        Row: {
          created_at: string | null
          effectue_par: string | null
          id: string
          montant: number
          motif: string | null
          souscripteur_dest_id: string | null
          souscripteur_source_id: string | null
          statut: string | null
        }
        Insert: {
          created_at?: string | null
          effectue_par?: string | null
          id?: string
          montant: number
          motif?: string | null
          souscripteur_dest_id?: string | null
          souscripteur_source_id?: string | null
          statut?: string | null
        }
        Update: {
          created_at?: string | null
          effectue_par?: string | null
          id?: string
          montant?: number
          motif?: string | null
          souscripteur_dest_id?: string | null
          souscripteur_source_id?: string | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferts_paiements_souscripteur_dest_id_fkey"
            columns: ["souscripteur_dest_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_paiements_souscripteur_source_id_fkey"
            columns: ["souscripteur_source_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      villages: {
        Row: {
          created_at: string | null
          est_actif: boolean | null
          id: string
          nom: string
          sous_prefecture_id: string | null
        }
        Insert: {
          created_at?: string | null
          est_actif?: boolean | null
          id?: string
          nom: string
          sous_prefecture_id?: string | null
        }
        Update: {
          created_at?: string | null
          est_actif?: boolean | null
          id?: string
          nom?: string
          sous_prefecture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "villages_sous_prefecture_id_fkey"
            columns: ["sous_prefecture_id"]
            isOneToOne: false
            referencedRelation: "sous_prefectures"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_profile_id: { Args: never; Returns: string }
      generate_plantation_id: { Args: never; Returns: string }
      generate_souscripteur_id: { Args: never; Returns: string }
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      notify_hierarchy: {
        Args: {
          p_data?: Json
          p_message: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

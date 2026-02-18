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
          created_at: string
          departement_id: string | null
          district_id: string | null
          email: string
          id: string
          justification: string | null
          motif: string | null
          motif_rejet: string | null
          nom_complet: string
          photo_url: string | null
          poste_souhaite: string | null
          region_id: string | null
          role_souhaite: string | null
          statut: string | null
          telephone: string | null
          traite_le: string | null
          traite_par: string | null
        }
        Insert: {
          created_at?: string
          departement_id?: string | null
          district_id?: string | null
          email: string
          id?: string
          justification?: string | null
          motif?: string | null
          motif_rejet?: string | null
          nom_complet: string
          photo_url?: string | null
          poste_souhaite?: string | null
          region_id?: string | null
          role_souhaite?: string | null
          statut?: string | null
          telephone?: string | null
          traite_le?: string | null
          traite_par?: string | null
        }
        Update: {
          created_at?: string
          departement_id?: string | null
          district_id?: string | null
          email?: string
          id?: string
          justification?: string | null
          motif?: string | null
          motif_rejet?: string | null
          nom_complet?: string
          photo_url?: string | null
          poste_souhaite?: string | null
          region_id?: string | null
          role_souhaite?: string | null
          statut?: string | null
          telephone?: string | null
          traite_le?: string | null
          traite_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_requests_departement_id_fkey"
            columns: ["departement_id"]
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
          {
            foreignKeyName: "account_requests_traite_par_fkey"
            columns: ["traite_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      backups_historique: {
        Row: {
          created_at: string
          created_by: string | null
          format: string | null
          id: string
          nom: string
          tables_incluses: Json | null
          taille_octets: number | null
          type_backup: string | null
          url_stockage: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          format?: string | null
          id?: string
          nom: string
          tables_incluses?: Json | null
          taille_octets?: number | null
          type_backup?: string | null
          url_stockage?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          format?: string | null
          id?: string
          nom?: string
          tables_incluses?: Json | null
          taille_octets?: number | null
          type_backup?: string | null
          url_stockage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "backups_historique_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      champs_personnalises: {
        Row: {
          actif: boolean | null
          created_at: string
          entite: string
          id: string
          libelle: string
          nom_champ: string
          obligatoire: boolean | null
          options: Json | null
          ordre: number | null
          type_champ: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          entite: string
          id?: string
          libelle: string
          nom_champ: string
          obligatoire?: boolean | null
          options?: Json | null
          ordre?: number | null
          type_champ?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          entite?: string
          id?: string
          libelle?: string
          nom_champ?: string
          obligatoire?: boolean | null
          options?: Json | null
          ordre?: number | null
          type_champ?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          created_at: string
          date_calcul: string | null
          date_validation: string | null
          id: string
          montant: number
          montant_base: number | null
          montant_commission: number | null
          paiement_id: string | null
          paye_at: string | null
          periode: string | null
          plantation_id: string | null
          profile_id: string
          statut: string | null
          taux: number | null
          taux_commission: number | null
          type_commission: string
          valide_par: string | null
        }
        Insert: {
          created_at?: string
          date_calcul?: string | null
          date_validation?: string | null
          id?: string
          montant: number
          montant_base?: number | null
          montant_commission?: number | null
          paiement_id?: string | null
          paye_at?: string | null
          periode?: string | null
          plantation_id?: string | null
          profile_id: string
          statut?: string | null
          taux?: number | null
          taux_commission?: number | null
          type_commission: string
          valide_par?: string | null
        }
        Update: {
          created_at?: string
          date_calcul?: string | null
          date_validation?: string | null
          id?: string
          montant?: number
          montant_base?: number | null
          montant_commission?: number | null
          paiement_id?: string | null
          paye_at?: string | null
          periode?: string | null
          plantation_id?: string | null
          profile_id?: string
          statut?: string | null
          taux?: number | null
          taux_commission?: number | null
          type_commission?: string
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "commissions_valide_par_fkey"
            columns: ["valide_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configurations_systeme: {
        Row: {
          categorie: string
          cle: string
          created_at: string
          description: string | null
          id: string
          modifiable: boolean | null
          type_valeur: string
          updated_at: string
          valeur: string
        }
        Insert: {
          categorie?: string
          cle: string
          created_at?: string
          description?: string | null
          id?: string
          modifiable?: boolean | null
          type_valeur?: string
          updated_at?: string
          valeur: string
        }
        Update: {
          categorie?: string
          cle?: string
          created_at?: string
          description?: string | null
          id?: string
          modifiable?: boolean | null
          type_valeur?: string
          updated_at?: string
          valeur?: string
        }
        Relationships: []
      }
      cotitulaires: {
        Row: {
          civilite: string | null
          created_at: string
          date_delivrance: string | null
          date_naissance: string | null
          id: string
          nom: string
          numero_piece: string | null
          photo_cni_recto_url: string | null
          photo_cni_verso_url: string | null
          photo_profil_url: string | null
          prenoms: string | null
          relation: string | null
          souscripteur_id: string | null
          telephone: string | null
          type_piece: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          civilite?: string | null
          created_at?: string
          date_delivrance?: string | null
          date_naissance?: string | null
          id?: string
          nom: string
          numero_piece?: string | null
          photo_cni_recto_url?: string | null
          photo_cni_verso_url?: string | null
          photo_profil_url?: string | null
          prenoms?: string | null
          relation?: string | null
          souscripteur_id?: string | null
          telephone?: string | null
          type_piece?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          civilite?: string | null
          created_at?: string
          date_delivrance?: string | null
          date_naissance?: string | null
          id?: string
          nom?: string
          numero_piece?: string | null
          photo_cni_recto_url?: string | null
          photo_cni_verso_url?: string | null
          photo_profil_url?: string | null
          prenoms?: string | null
          relation?: string | null
          souscripteur_id?: string | null
          telephone?: string | null
          type_piece?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotitulaires_souscripteur_id_fkey"
            columns: ["souscripteur_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      departements: {
        Row: {
          code: string | null
          created_at: string
          district_id: string | null
          est_actif: boolean | null
          id: string
          nom: string
          region_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          district_id?: string | null
          est_actif?: boolean | null
          id?: string
          nom: string
          region_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          district_id?: string | null
          est_actif?: boolean | null
          id?: string
          nom?: string
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departements_district_id_fkey"
            columns: ["district_id"]
            isOneToOne: false
            referencedRelation: "districts"
            referencedColumns: ["id"]
          },
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
          created_at: string
          est_actif: boolean | null
          id: string
          nom: string
          region_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          est_actif?: boolean | null
          id?: string
          nom: string
          region_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          est_actif?: boolean | null
          id?: string
          nom?: string
          region_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "districts_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nom_fichier: string
          notes: string | null
          plantation_id: string | null
          souscripteur_id: string | null
          statut: string | null
          type_document: string
          updated_at: string
          url: string
          valide_at: string | null
          valide_par: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nom_fichier: string
          notes?: string | null
          plantation_id?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          type_document: string
          updated_at?: string
          url: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nom_fichier?: string
          notes?: string | null
          plantation_id?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          type_document?: string
          updated_at?: string
          url?: string
          valide_at?: string | null
          valide_par?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_plantation_id_fkey"
            columns: ["plantation_id"]
            isOneToOne: false
            referencedRelation: "plantations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_souscripteur_id_fkey"
            columns: ["souscripteur_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_valide_par_fkey"
            columns: ["valide_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          actif: boolean | null
          created_at: string
          id: string
          nom: string
          region_id: string | null
          responsable_id: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          id?: string
          nom: string
          region_id?: string | null
          responsable_id?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          id?: string
          nom?: string
          region_id?: string | null
          responsable_id?: string | null
          updated_at?: string
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
      fedapay_events: {
        Row: {
          amount: number | null
          created_at: string
          customer_email: string | null
          customer_phone: string | null
          event_id: string | null
          event_type: string
          id: string
          paiement_id: string | null
          processed: boolean | null
          processed_at: string | null
          raw_payload: Json | null
          status: string | null
          transaction_id: string | null
          transaction_reference: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          paiement_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string | null
          transaction_id?: string | null
          transaction_reference?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_phone?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          paiement_id?: string | null
          processed?: boolean | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string | null
          transaction_id?: string | null
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fedapay_events_paiement_id_fkey"
            columns: ["paiement_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
        ]
      }
      historique_activites: {
        Row: {
          action: string
          ancien_valeurs: Json | null
          created_at: string
          created_by: string | null
          details: string | null
          id: string
          ip_address: string | null
          nouvelles_valeurs: Json | null
          record_id: string
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          ancien_valeurs?: Json | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          nouvelles_valeurs?: Json | null
          record_id: string
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          ancien_valeurs?: Json | null
          created_at?: string
          created_by?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          nouvelles_valeurs?: Json | null
          record_id?: string
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historique_activites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interventions_techniques: {
        Row: {
          created_at: string | null
          date_intervention: string | null
          id: string
          observations: string | null
          photos_urls: Json | null
          plantation_id: string | null
          recommandations: string | null
          technicien_id: string | null
          type_intervention: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          date_intervention?: string | null
          id?: string
          observations?: string | null
          photos_urls?: Json | null
          plantation_id?: string | null
          recommandations?: string | null
          technicien_id?: string | null
          type_intervention?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          date_intervention?: string | null
          id?: string
          observations?: string | null
          photos_urls?: Json | null
          plantation_id?: string | null
          recommandations?: string | null
          technicien_id?: string | null
          type_intervention?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interventions_techniques_plantation_id_fkey"
            columns: ["plantation_id"]
            isOneToOne: false
            referencedRelation: "plantations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interventions_techniques_technicien_id_fkey"
            columns: ["technicien_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          contenu: string
          created_at: string
          created_by: string | null
          id: string
          plantation_id: string | null
          souscripteur_id: string | null
          updated_at: string
        }
        Insert: {
          contenu: string
          created_at?: string
          created_by?: string | null
          id?: string
          plantation_id?: string | null
          souscripteur_id?: string | null
          updated_at?: string
        }
        Update: {
          contenu?: string
          created_at?: string
          created_by?: string | null
          id?: string
          plantation_id?: string | null
          souscripteur_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_plantation_id_fkey"
            columns: ["plantation_id"]
            isOneToOne: false
            referencedRelation: "plantations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_souscripteur_id_fkey"
            columns: ["souscripteur_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offres: {
        Row: {
          actif: boolean | null
          avantages: Json | null
          code: string
          contribution_mensuelle_par_ha: number
          couleur: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          montant_da_par_ha: number
          nom: string
          ordre: number | null
          updated_at: string
        }
        Insert: {
          actif?: boolean | null
          avantages?: Json | null
          code: string
          contribution_mensuelle_par_ha?: number
          couleur?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          montant_da_par_ha?: number
          nom: string
          ordre?: number | null
          updated_at?: string
        }
        Update: {
          actif?: boolean | null
          avantages?: Json | null
          code?: string
          contribution_mensuelle_par_ha?: number
          couleur?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          montant_da_par_ha?: number
          nom?: string
          ordre?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      paiements: {
        Row: {
          created_at: string
          date_paiement: string | null
          fedapay_reference: string | null
          fedapay_transaction_id: string | null
          id: string
          metadata: Json | null
          mode_paiement: string | null
          montant: number
          montant_paye: number | null
          plantation_id: string | null
          reference: string | null
          souscripteur_id: string | null
          statut: string | null
          type_paiement: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_paiement?: string | null
          fedapay_reference?: string | null
          fedapay_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          mode_paiement?: string | null
          montant: number
          montant_paye?: number | null
          plantation_id?: string | null
          reference?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          type_paiement?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_paiement?: string | null
          fedapay_reference?: string | null
          fedapay_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          mode_paiement?: string | null
          montant?: number
          montant_paye?: number | null
          plantation_id?: string | null
          reference?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          type_paiement?: string | null
          updated_at?: string
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
      parametres_notifications: {
        Row: {
          actif: boolean | null
          canal: string | null
          created_at: string
          id: string
          type_notification: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actif?: boolean | null
          canal?: string | null
          created_at?: string
          id?: string
          type_notification: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actif?: boolean | null
          canal?: string | null
          created_at?: string
          id?: string
          type_notification?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parametres_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photos_plantation: {
        Row: {
          created_at: string | null
          date_prise: string | null
          description: string | null
          id: string
          phase: string | null
          plantation_id: string | null
          prise_par: string | null
          type_photo: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          date_prise?: string | null
          description?: string | null
          id?: string
          phase?: string | null
          plantation_id?: string | null
          prise_par?: string | null
          type_photo?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          date_prise?: string | null
          description?: string | null
          id?: string
          phase?: string | null
          plantation_id?: string | null
          prise_par?: string | null
          type_photo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_plantation_plantation_id_fkey"
            columns: ["plantation_id"]
            isOneToOne: false
            referencedRelation: "plantations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_plantation_prise_par_fkey"
            columns: ["prise_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plantations: {
        Row: {
          age_plantation: number | null
          alerte_non_paiement: boolean
          alerte_visite_retard: boolean
          altitude: number | null
          annee_plantation: number | null
          chef_village_nom: string | null
          chef_village_telephone: string | null
          coordonnees_gps: string | null
          created_at: string
          created_by: string | null
          date_activation: string | null
          date_plantation: string | null
          date_signature_contrat: string | null
          densite_plants: number | null
          departement_id: string | null
          district_id: string | null
          document_foncier_date_delivrance: string | null
          document_foncier_numero: string | null
          document_foncier_type: string | null
          document_foncier_url: string | null
          id: string
          id_unique: string | null
          latitude: number | null
          localite: string | null
          longitude: number | null
          montant_contribution_mensuelle: number | null
          montant_da: number | null
          nom: string | null
          nom_plantation: string | null
          nombre_plants: number | null
          notes_internes: string | null
          region_id: string | null
          sous_prefecture_id: string | null
          souscripteur_id: string
          statut: string | null
          statut_global: string | null
          superficie_activee: number | null
          superficie_ha: number
          type_culture: string | null
          updated_at: string
          updated_by: string | null
          variete: string | null
          village_id: string | null
          village_nom: string | null
        }
        Insert: {
          age_plantation?: number | null
          alerte_non_paiement?: boolean
          alerte_visite_retard?: boolean
          altitude?: number | null
          annee_plantation?: number | null
          chef_village_nom?: string | null
          chef_village_telephone?: string | null
          coordonnees_gps?: string | null
          created_at?: string
          created_by?: string | null
          date_activation?: string | null
          date_plantation?: string | null
          date_signature_contrat?: string | null
          densite_plants?: number | null
          departement_id?: string | null
          district_id?: string | null
          document_foncier_date_delivrance?: string | null
          document_foncier_numero?: string | null
          document_foncier_type?: string | null
          document_foncier_url?: string | null
          id?: string
          id_unique?: string | null
          latitude?: number | null
          localite?: string | null
          longitude?: number | null
          montant_contribution_mensuelle?: number | null
          montant_da?: number | null
          nom?: string | null
          nom_plantation?: string | null
          nombre_plants?: number | null
          notes_internes?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          souscripteur_id: string
          statut?: string | null
          statut_global?: string | null
          superficie_activee?: number | null
          superficie_ha?: number
          type_culture?: string | null
          updated_at?: string
          updated_by?: string | null
          variete?: string | null
          village_id?: string | null
          village_nom?: string | null
        }
        Update: {
          age_plantation?: number | null
          alerte_non_paiement?: boolean
          alerte_visite_retard?: boolean
          altitude?: number | null
          annee_plantation?: number | null
          chef_village_nom?: string | null
          chef_village_telephone?: string | null
          coordonnees_gps?: string | null
          created_at?: string
          created_by?: string | null
          date_activation?: string | null
          date_plantation?: string | null
          date_signature_contrat?: string | null
          densite_plants?: number | null
          departement_id?: string | null
          district_id?: string | null
          document_foncier_date_delivrance?: string | null
          document_foncier_numero?: string | null
          document_foncier_type?: string | null
          document_foncier_url?: string | null
          id?: string
          id_unique?: string | null
          latitude?: number | null
          localite?: string | null
          longitude?: number | null
          montant_contribution_mensuelle?: number | null
          montant_da?: number | null
          nom?: string | null
          nom_plantation?: string | null
          nombre_plants?: number | null
          notes_internes?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          souscripteur_id?: string
          statut?: string | null
          statut_global?: string | null
          superficie_activee?: number | null
          superficie_ha?: number
          type_culture?: string | null
          updated_at?: string
          updated_by?: string | null
          variete?: string | null
          village_id?: string | null
          village_nom?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plantations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "plantations_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      portefeuilles: {
        Row: {
          created_at: string
          dernier_versement_date: string | null
          dernier_versement_montant: number | null
          id: string
          solde_commissions: number | null
          total_gagne: number | null
          total_retire: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dernier_versement_date?: string | null
          dernier_versement_montant?: number | null
          id?: string
          solde_commissions?: number | null
          total_gagne?: number | null
          total_retire?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dernier_versement_date?: string | null
          dernier_versement_montant?: number | null
          id?: string
          solde_commissions?: number | null
          total_gagne?: number | null
          total_retire?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portefeuilles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actif: boolean | null
          created_at: string
          email: string | null
          equipe_id: string | null
          id: string
          nom_complet: string | null
          photo_url: string | null
          role: string | null
          telephone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          email?: string | null
          equipe_id?: string | null
          id?: string
          nom_complet?: string | null
          photo_url?: string | null
          role?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          email?: string | null
          equipe_id?: string | null
          id?: string
          nom_complet?: string | null
          photo_url?: string | null
          role?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean | null
          applique_toutes_offres: boolean | null
          created_at: string
          date_debut: string
          date_fin: string
          description: string | null
          id: string
          nom: string
          pourcentage_reduction: number
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          applique_toutes_offres?: boolean | null
          created_at?: string
          date_debut?: string
          date_fin: string
          description?: string | null
          id?: string
          nom: string
          pourcentage_reduction?: number
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          applique_toutes_offres?: boolean | null
          created_at?: string
          date_debut?: string
          date_fin?: string
          description?: string | null
          id?: string
          nom?: string
          pourcentage_reduction?: number
          updated_at?: string
        }
        Relationships: []
      }
      promotions_offres: {
        Row: {
          created_at: string
          id: string
          offre_id: string
          promotion_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          offre_id: string
          promotion_id: string
        }
        Update: {
          created_at?: string
          id?: string
          offre_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_offres_offre_id_fkey"
            columns: ["offre_id"]
            isOneToOne: false
            referencedRelation: "offres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_offres_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          code: string | null
          created_at: string
          district_id: string | null
          est_active: boolean | null
          id: string
          nom: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          district_id?: string | null
          est_active?: boolean | null
          id?: string
          nom: string
        }
        Update: {
          code?: string | null
          created_at?: string
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
          {
            foreignKeyName: "remboursements_traite_par_fkey"
            columns: ["traite_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      retraits_portefeuille: {
        Row: {
          created_at: string
          date_demande: string
          date_traitement: string | null
          id: string
          mode_paiement: string | null
          montant: number
          notes: string | null
          numero_compte: string | null
          portefeuille_id: string
          statut: string | null
          traite_par: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date_demande?: string
          date_traitement?: string | null
          id?: string
          mode_paiement?: string | null
          montant: number
          notes?: string | null
          numero_compte?: string | null
          portefeuille_id: string
          statut?: string | null
          traite_par?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date_demande?: string
          date_traitement?: string | null
          id?: string
          mode_paiement?: string | null
          montant?: number
          notes?: string | null
          numero_compte?: string | null
          portefeuille_id?: string
          statut?: string | null
          traite_par?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retraits_portefeuille_portefeuille_id_fkey"
            columns: ["portefeuille_id"]
            isOneToOne: false
            referencedRelation: "portefeuilles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retraits_portefeuille_traite_par_fkey"
            columns: ["traite_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retraits_portefeuille_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sous_prefectures: {
        Row: {
          code: string | null
          created_at: string
          departement_id: string | null
          est_active: boolean | null
          id: string
          nom: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          departement_id?: string | null
          est_active?: boolean | null
          id?: string
          nom: string
        }
        Update: {
          code?: string | null
          created_at?: string
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
          adresse: string | null
          created_at: string
          date_naissance: string | null
          departement_id: string | null
          district_id: string | null
          email: string | null
          id: string
          id_unique: string | null
          lieu_naissance: string | null
          localite: string | null
          nationalite: string | null
          nom: string
          nom_complet: string | null
          nombre_plantations: number | null
          numero_piece: string | null
          offre_id: string | null
          photo_url: string | null
          piece_recto_url: string | null
          piece_verso_url: string | null
          prenoms: string | null
          region_id: string | null
          sous_prefecture_id: string | null
          statut: string | null
          statut_global: string | null
          technico_commercial_id: string | null
          telephone: string
          total_contributions_versees: number | null
          total_da_verse: number | null
          total_hectares: number | null
          type_piece: string | null
          updated_at: string
          village_id: string | null
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          date_naissance?: string | null
          departement_id?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          id_unique?: string | null
          lieu_naissance?: string | null
          localite?: string | null
          nationalite?: string | null
          nom: string
          nom_complet?: string | null
          nombre_plantations?: number | null
          numero_piece?: string | null
          offre_id?: string | null
          photo_url?: string | null
          piece_recto_url?: string | null
          piece_verso_url?: string | null
          prenoms?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          statut?: string | null
          statut_global?: string | null
          technico_commercial_id?: string | null
          telephone: string
          total_contributions_versees?: number | null
          total_da_verse?: number | null
          total_hectares?: number | null
          type_piece?: string | null
          updated_at?: string
          village_id?: string | null
        }
        Update: {
          adresse?: string | null
          created_at?: string
          date_naissance?: string | null
          departement_id?: string | null
          district_id?: string | null
          email?: string | null
          id?: string
          id_unique?: string | null
          lieu_naissance?: string | null
          localite?: string | null
          nationalite?: string | null
          nom?: string
          nom_complet?: string | null
          nombre_plantations?: number | null
          numero_piece?: string | null
          offre_id?: string | null
          photo_url?: string | null
          piece_recto_url?: string | null
          piece_verso_url?: string | null
          prenoms?: string | null
          region_id?: string | null
          sous_prefecture_id?: string | null
          statut?: string | null
          statut_global?: string | null
          technico_commercial_id?: string | null
          telephone?: string
          total_contributions_versees?: number | null
          total_da_verse?: number | null
          total_hectares?: number | null
          type_piece?: string | null
          updated_at?: string
          village_id?: string | null
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
          {
            foreignKeyName: "souscripteurs_technico_commercial_id_fkey"
            columns: ["technico_commercial_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "souscripteurs_village_id_fkey"
            columns: ["village_id"]
            isOneToOne: false
            referencedRelation: "villages"
            referencedColumns: ["id"]
          },
        ]
      }
      souscriptions_brouillon: {
        Row: {
          created_at: string
          created_by: string | null
          donnees: Json | null
          etape_actuelle: number | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          donnees?: Json | null
          etape_actuelle?: number | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          donnees?: Json | null
          etape_actuelle?: number | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      statuts_personnalises: {
        Row: {
          actif: boolean | null
          code: string
          couleur: string | null
          created_at: string
          description: string | null
          entite: string
          id: string
          libelle: string
          ordre: number | null
          updated_at: string
        }
        Insert: {
          actif?: boolean | null
          code: string
          couleur?: string | null
          created_at?: string
          description?: string | null
          entite: string
          id?: string
          libelle: string
          ordre?: number | null
          updated_at?: string
        }
        Update: {
          actif?: boolean | null
          code?: string
          couleur?: string | null
          created_at?: string
          description?: string | null
          entite?: string
          id?: string
          libelle?: string
          ordre?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      tickets_support: {
        Row: {
          assigne_a: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          priorite: string | null
          resolu_at: string | null
          souscripteur_id: string | null
          statut: string | null
          titre: string
          updated_at: string
        }
        Insert: {
          assigne_a?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priorite?: string | null
          resolu_at?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          titre: string
          updated_at?: string
        }
        Update: {
          assigne_a?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          priorite?: string | null
          resolu_at?: string | null
          souscripteur_id?: string | null
          statut?: string | null
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_support_assigne_a_fkey"
            columns: ["assigne_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_support_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_support_souscripteur_id_fkey"
            columns: ["souscripteur_id"]
            isOneToOne: false
            referencedRelation: "souscripteurs"
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
          resolution: string | null
          statut: string | null
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
          resolution?: string | null
          statut?: string | null
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
          resolution?: string | null
          statut?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_techniques_assigne_a_fkey"
            columns: ["assigne_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_techniques_cree_par_fkey"
            columns: ["cree_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
          paiement_source_id: string | null
          souscripteur_dest_id: string | null
          souscripteur_source_id: string | null
        }
        Insert: {
          created_at?: string | null
          effectue_par?: string | null
          id?: string
          montant: number
          motif?: string | null
          paiement_source_id?: string | null
          souscripteur_dest_id?: string | null
          souscripteur_source_id?: string | null
        }
        Update: {
          created_at?: string | null
          effectue_par?: string | null
          id?: string
          montant?: number
          motif?: string | null
          paiement_source_id?: string | null
          souscripteur_dest_id?: string | null
          souscripteur_source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferts_paiements_effectue_par_fkey"
            columns: ["effectue_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferts_paiements_paiement_source_id_fkey"
            columns: ["paiement_source_id"]
            isOneToOne: false
            referencedRelation: "paiements"
            referencedColumns: ["id"]
          },
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
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      villages: {
        Row: {
          code: string | null
          created_at: string
          est_actif: boolean | null
          id: string
          nom: string
          sous_prefecture_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          est_actif?: boolean | null
          id?: string
          nom: string
          sous_prefecture_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
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
      generate_souscripteur_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _profile_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin_or_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "directeur_tc"
        | "responsable_zone"
        | "comptable"
        | "commercial"
        | "service_client"
        | "operations"
        | "user"
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
    Enums: {
      app_role: [
        "super_admin",
        "directeur_tc",
        "responsable_zone",
        "comptable",
        "commercial",
        "service_client",
        "operations",
        "user",
      ],
    },
  },
} as const

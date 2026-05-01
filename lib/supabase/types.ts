export type ThesisLevel = "undergraduate" | "masteral" | "doctoral";
export type SubmissionType = "draft" | "final";
export type ThesisStatus = "pending" | "accepted" | "flagged" | "rejected";
export type DisputeStatus = "open" | "resolved";
export type DisputeAuthorRole = "flagger" | "admin" | "owner";
export type AlertStatus = "notified"; 

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          is_approved: boolean;
          is_admin: boolean;
          is_active: boolean;
          last_active_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          is_approved?: boolean;
          is_admin?: boolean;
          is_active?: boolean;
          last_active_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          is_approved?: boolean;
          is_admin?: boolean;
          is_active?: boolean;
          last_active_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      theses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          title_normalized: string; 
          authors_search: string;
          thesis_level: ThesisLevel;
          thesis_category: string;
          submission_type: SubmissionType;
          sha256_hash: string;
          tx_hash: string;
          block_timestamp: string;
          previous_thesis_id: string | null;
          status: ThesisStatus;
          registered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          title_normalized: string; 
          authors_search?: string;
          thesis_level: ThesisLevel;
          thesis_category: string;
          submission_type: SubmissionType;
          sha256_hash: string;
          tx_hash: string;
          block_timestamp: string;
          previous_thesis_id?: string | null;
          status?: ThesisStatus;
          registered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          title_normalized?: string; 
          authors_search?: string;
          thesis_level?: ThesisLevel;
          thesis_category?: string;
          submission_type?: SubmissionType;
          sha256_hash?: string;
          tx_hash?: string;
          block_timestamp?: string;
          previous_thesis_id?: string | null;
          status?: ThesisStatus;
          registered_at?: string;
        };
        Relationships: [];
      };
      thesis_authors: {
        Row: {
          id: string;
          thesis_id: string;
          name: string;
          position: number;
        };
        Insert: {
          id?: string;
          thesis_id: string;
          name: string;
          position: number;
        };
        Update: {
          id?: string;
          thesis_id?: string;
          name?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "thesis_authors_thesis_id_fkey";
            columns: ["thesis_id"];
            isOneToOne: false;
            referencedRelation: "theses";
            referencedColumns: ["id"];
          },
        ];
      };
      disputes: {
        Row: {
          id: string;
          thesis_id: string;
          flagged_by: string;
          status: DisputeStatus;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thesis_id: string;
          flagged_by: string;
          status?: DisputeStatus;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thesis_id?: string;
          flagged_by?: string;
          status?: DisputeStatus;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      dispute_messages: {
        Row: {
          id: string;
          dispute_id: string;
          author_id: string;
          author_role: DisputeAuthorRole;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          author_id: string;
          author_role: DisputeAuthorRole;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          dispute_id?: string;
          author_id?: string;
          author_role?: DisputeAuthorRole;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      dispute_reads: {
        Row: {
          dispute_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          dispute_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: {
          dispute_id?: string;
          user_id?: string;
          last_read_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          thesis_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          thesis_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          thesis_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      title_alerts: {
        Row: {
          id: string;
          new_thesis_id: string;
          matched_thesis_id: string;
          notified_user_id: string;
          similarity_score: number;
          status: AlertStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          new_thesis_id: string;
          matched_thesis_id: string;
          notified_user_id: string;
          similarity_score: number;
          status?: AlertStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          new_thesis_id?: string;
          matched_thesis_id?: string;
          notified_user_id?: string;
          similarity_score?: number;
          status?: AlertStatus;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_rate_limit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_ms: number;
        };
        Returns: {
          success: boolean;
          remaining: number;
        }[];
      };
      find_similar_titles: {
        Args: {
          target_title: string;
          similarity_threshold?: number;
          exclude_thesis_id?: string;
        };
        Returns: {
          thesis_id: string;
          title: string;
          title_normalized: string;
          user_id: string;
          similarity_score: number;
        }[];
      };
      register_thesis_with_authors: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_title_normalized: string;
          p_thesis_level: ThesisLevel;
          p_thesis_category: string;
          p_submission_type: SubmissionType;
          p_sha256_hash: string;
          p_tx_hash: string;
          p_block_timestamp: string;
          p_previous_thesis_id: string | null;
          p_author_names: string[];
        };
        Returns: string;
      };
    };
    Enums: {
      thesis_level: ThesisLevel;
      submission_type: SubmissionType;
      thesis_status: ThesisStatus;
      dispute_status: DisputeStatus;
      dispute_author_role: DisputeAuthorRole;
      alert_status: AlertStatus;
    };
  };
}
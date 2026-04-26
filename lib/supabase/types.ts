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
          author_name: string;
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
          author_name: string;
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
          author_name?: string;
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
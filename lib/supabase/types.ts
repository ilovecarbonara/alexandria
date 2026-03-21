export type ThesisLevel = "undergraduate" | "masteral" | "doctoral";
export type SubmissionType = "draft" | "final";
export type DisputeStatus = "open" | "resolved";

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
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          is_approved?: boolean;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          is_approved?: boolean;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      theses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author_name: string;
          thesis_level: ThesisLevel;
          thesis_category: string;
          submission_type: SubmissionType;
          sha256_hash: string;
          tx_hash: string;
          block_timestamp: string;
          registered_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author_name: string;
          thesis_level: ThesisLevel;
          thesis_category: string;
          submission_type: SubmissionType;
          sha256_hash: string;
          tx_hash: string;
          block_timestamp: string;
          registered_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          author_name?: string;
          thesis_level?: ThesisLevel;
          thesis_category?: string;
          submission_type?: SubmissionType;
          sha256_hash?: string;
          tx_hash?: string;
          block_timestamp?: string;
          registered_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          thesis_id: string;
          flagged_by: string;
          reason: string;
          status: DisputeStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          thesis_id: string;
          flagged_by: string;
          reason: string;
          status?: DisputeStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          thesis_id?: string;
          flagged_by?: string;
          reason?: string;
          status?: DisputeStatus;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      thesis_level: ThesisLevel;
      submission_type: SubmissionType;
      dispute_status: DisputeStatus;
    };
  };
}

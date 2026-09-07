export interface ApiResponse {
  message?: string;
  error?: string;
  detail?: string;
  document?: {
    id?: number;
    filename?: string;
    file_type?: string;
    file_size?: number;
    file_hash?: string;
    status?: string;
    cloudinary_url?: string;
  };
  verification?: {
    authenticity_score?: number;
    completeness_score?: number;
    consistency_score?: number;
    overall_score?: number;
    status?: string;
  };
  result?: {
    document_type?: string;
    classification_confidence?: number;
    fields?: Record<string, unknown>;
    sections_detected?: Record<string, boolean>;
      layoutlm?: {
      model?: string;
      page_count?: number;
      token_count?: number;
      status?: string;
      bounding_boxes?: number[][];
      layout_analysis?: {
        ocr_enabled?: boolean;
        document_image_processed?: boolean;
        bounding_boxes_processed?: boolean;
        tokens_processed?: number;
      };
    };
    verification?: {
      completeness?: number;
      consistency?: number;
      authenticity?: number;
      tamper_score?: number;
      ela_score?: number;
      ela_image_path?: string;
      overall_score?: number;
      status?: string;
      message?: string;
      details?: string[];
      completeness_analysis?: {
        score?: number;
        present_fields?: string[];
        missing_fields?: string[];
        total_fields?: number;
        present_count?: number;
      };
      consistency_analysis?: {
        score?: number;
        checked_fields?: string[];
        inconsistent_fields?: string[];
        checks?: string[];
      };
      authenticity_analysis?: {
        score?: number;
        passed_checks?: number;
        total_checks?: number;
        checks?: string[];
      };
      tamper_analysis?: {
        score?: number;
        status?: string;
        suspicious_indicators?: string[];
      };
    };
  };
}

export interface DocumentItem {
  file: File;
  processing: boolean;
  verified: boolean;
  data?: ApiResponse;
  error?: string;
  logs?: string[];
  progress?: number;
}

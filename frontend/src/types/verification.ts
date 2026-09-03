export interface VerificationScores {
  authenticity_score: number;
  completeness_score: number;
  consistency_score: number;
  overall_score: number;
}

export interface VerificationDetails {
  completeness: number;
  consistency: number;
  authenticity: number;
  tamper_score: number;
  overall_score: number;
  status: string;
  details: string[];
  completeness_analysis?: {
    score: number;
    total_fields: number;
    present_count: number;
    missing_count: number;
    present_fields: string[];
    missing_fields: string[];
  };
  consistency_analysis?: {
    score: number;
    checked_fields: string[];
    inconsistent_fields: string[];
    checks: string[];
  };
  authenticity_analysis?: {
    score: number;
    checks: string[];
    passed_checks: number;
    total_checks: number;
  };
  tamper_analysis?: {
    score: number;
    status: string;
    suspicious_indicators: string[];
  };
}

export interface VerificationResult {
  document_type: string;
  classification_confidence: number;
  fields: Record<string, unknown>;
  sections_detected: Record<string, boolean>;
  verification: VerificationDetails;
}

export interface VerificationResponse {
  message: string;
  document: {
    id: number;
    filename: string;
    file_type: string;
    file_size: number;
    file_hash: string;
    status: string;
  };
  verification: VerificationScores;
  result: VerificationResult;
}
export interface ToolCall {
  tool: string;
  arguments: any;
  result: any;
  latency_ms: number;
  status: 'ok' | 'error';
}

export type StructuredDataType = 'cnps_table' | 'payroll_tax_summary' | 'vat_summary' | 'validation_result' | 'indicator_chart' | 'fiscal_obligations';

export interface StructuredData {
  type: StructuredDataType;
  data: any;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tool_calls?: ToolCall[];
  structured?: StructuredData;
  thinking?: string;
}

// CNPS Contributions Data Models
export interface EmployeeCNPSInput {
  gross_salary: number;
  sector_risk_group: 'A' | 'B' | 'C';
}

export interface EmployeeCNPSResult {
  gross_salary: number;
  capped_base: number;
  old_age_pension_employee: number;
  old_age_pension_employer: number;
  family_allowances_employer: number;
  work_injury_employer: number;
  total_employee: number;
  total_employer: number;
}

export interface CNPSTablesData {
  employees: EmployeeCNPSResult[];
  totals: {
    gross_salary: number;
    old_age_pension_employee: number;
    old_age_pension_employer: number;
    family_allowances_employer: number;
    work_injury_employer: number;
    total_employee: number;
    total_employer: number;
  };
  ceiling: number;
  smig: number;
}

// Payroll Tax Data Models
export interface PayrollTaxData {
  gross_salary: number;
  taxable_base: number;
  irpp: number;
  other_withholdings: number;
  net_salary: number;
  breakdown: {
    irpp_bracket_details?: Array<{
      bracket_range: string;
      rate: number;
      amount: number;
    }>;
    cac?: number; // Centimes Additionnels Communaux
    communal_tax?: number;
    pension_employee?: number;
  };
}

// VAT Data Models
export interface VATData {
  amount_excl_tax: number;
  vat_rate: number;
  vat_amount: number;
  cac_rate?: number; // Usually 10% of VAT
  cac_amount?: number;
  amount_incl_tax: number;
  is_declaration_recap?: boolean;
}

// Registration Validation Data Models
export interface ValidationData {
  number: string;
  type: 'CNPS' | 'NIU';
  valid: boolean;
  normalized: string;
  reason?: string;
  pattern_description?: string;
}

// Economic Indicator Models (World Bank API)
export interface Observation {
  year: number;
  value: number | null;
}

export interface EconomicIndicatorData {
  indicator_code: string;
  indicator_name: string;
  country: string;
  observations: Observation[];
  source: string;
}

// Fiscal Obligations Models
export interface FiscalObligation {
  type: string;
  label: string;
  frequency: string;
  deadline_description: string;
  applicable_to: string;
  legal_reference: string;
}

export interface FiscalObligationsData {
  obligation_type: string;
  month: number | null;
  obligations: FiscalObligation[];
  count: number;
}

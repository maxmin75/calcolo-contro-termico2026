export type UserType = "privato" | "azienda" | "ente_pubblico";
export type ClimateZone = "A" | "B" | "C" | "D" | "E" | "F";
export type OldSystemType = "gas" | "gpl" | "gasolio" | "biomassa";
export type NewSystemType =
  | "pompa_di_calore"
  | "biomassa"
  | "solare_termico"
  | "ibrido";

export type EfficiencyClass = "A+" | "A++" | "A+++";

export interface OldSystem {
  type: OldSystemType;
  year: number;
  estimated_power_kw: number;
}

export interface NewSystem {
  type: NewSystemType;
  power_kw: number;
  has_storage: boolean;
  efficiency_class: EfficiencyClass;
}

export interface Costs {
  total_estimated_cost: number;
}

export interface SimulationInput {
  user_type: UserType;
  climate_zone: ClimateZone;
  old_system: OldSystem;
  new_system: NewSystem;
  costs: Costs;
}

export interface GseConfig {
  base_percentage: Record<UserType, number>;
  climate_multiplier: Record<ClimateZone, number>;
  system_multiplier: Record<NewSystemType, number>;
  max_incentive: Record<UserType, number>;
  old_system_multiplier?: {
    by_type?: Partial<Record<OldSystemType, number>>;
    by_age?: { year_cutoff: number; multiplier: number }[];
  };
  efficiency_multiplier?: Partial<Record<EfficiencyClass, number>>;
}

export interface SimulationResult {
  raw_incentive: number;
  final_incentive: number;
  percent_covered: number;
  payment_mode: "unica_soluzione" | "rate_annuali";
  payment_years: 2 | 5;
  annual_payment: number;
}

export const DEFAULT_GSE_CONFIG: GseConfig = {
  base_percentage: {
    privato: 0.55,
    azienda: 0.65,
    ente_pubblico: 1,
  },
  climate_multiplier: {
    A: 0.9,
    B: 1,
    C: 1.05,
    D: 1.1,
    E: 1.2,
    F: 1.3,
  },
  system_multiplier: {
    pompa_di_calore: 1.2,
    biomassa: 1.1,
    solare_termico: 0.9,
    ibrido: 1.3,
  },
  max_incentive: {
    privato: 15000,
    azienda: 40000,
    ente_pubblico: 100000,
  },
  old_system_multiplier: {
    by_type: {
      gasolio: 1.1,
      gpl: 1.05,
    },
    by_age: [
      { year_cutoff: 2005, multiplier: 1.05 },
      { year_cutoff: 1990, multiplier: 1.1 },
    ],
  },
  efficiency_multiplier: {
    "A+": 1,
    "A++": 1.05,
    "A+++": 1.1,
  },
};

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateInput(input: SimulationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!input.costs?.total_estimated_cost || input.costs.total_estimated_cost <= 0) {
    issues.push({ field: "costs.total_estimated_cost", message: "Costo totale non valido" });
  }

  if (input.old_system.year < 1970 || input.old_system.year > new Date().getFullYear()) {
    issues.push({ field: "old_system.year", message: "Anno impianto esistente non valido" });
  }

  if (input.old_system.estimated_power_kw <= 0) {
    issues.push({ field: "old_system.estimated_power_kw", message: "Potenza stimata non valida" });
  }

  if (input.new_system.power_kw <= 0) {
    issues.push({ field: "new_system.power_kw", message: "Potenza nuovo impianto non valida" });
  }

  return issues;
}

function getOldSystemMultiplier(
  oldSystem: OldSystem,
  config: GseConfig
): number {
  let multiplier = 1;
  const byType = config.old_system_multiplier?.by_type;
  if (byType && byType[oldSystem.type]) {
    multiplier *= byType[oldSystem.type] as number;
  }

  const byAge = config.old_system_multiplier?.by_age ?? [];
  for (const rule of byAge) {
    if (oldSystem.year <= rule.year_cutoff) {
      multiplier *= rule.multiplier;
      break;
    }
  }

  return multiplier;
}

function getEfficiencyMultiplier(
  efficiency: EfficiencyClass,
  config: GseConfig
): number {
  return config.efficiency_multiplier?.[efficiency] ?? 1;
}

export function calculateIncentive(
  input: SimulationInput,
  config: GseConfig = DEFAULT_GSE_CONFIG
): SimulationResult {
  const base = config.base_percentage[input.user_type];
  const climate = config.climate_multiplier[input.climate_zone];
  const system = config.system_multiplier[input.new_system.type];
  const oldMultiplier = getOldSystemMultiplier(input.old_system, config);
  const efficiencyMultiplier = getEfficiencyMultiplier(input.new_system.efficiency_class, config);

  const rawIncentive =
    input.costs.total_estimated_cost *
    base *
    climate *
    system *
    oldMultiplier *
    efficiencyMultiplier;

  const max = config.max_incentive[input.user_type];
  const finalIncentive = Math.min(rawIncentive, max);

  const paymentMode = finalIncentive <= 5000 ? "unica_soluzione" : "rate_annuali";
  const paymentYears = finalIncentive > 15000 ? 5 : 2;
  const annualPayment = paymentMode === "rate_annuali" ? finalIncentive / paymentYears : finalIncentive;

  return {
    raw_incentive: round2(rawIncentive),
    final_incentive: round2(finalIncentive),
    percent_covered: round2((finalIncentive / input.costs.total_estimated_cost) * 100),
    payment_mode: paymentMode,
    payment_years: paymentYears,
    annual_payment: round2(annualPayment),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

import { strict as assert } from "node:assert";
import {
  calculateIncentive,
  DEFAULT_GSE_CONFIG,
  SimulationInput,
} from "../contotermico-calcolo";

const baseInput: SimulationInput = {
  user_type: "privato",
  climate_zone: "D",
  old_system: {
    type: "gasolio",
    year: 1995,
    estimated_power_kw: 12,
  },
  new_system: {
    type: "pompa_di_calore",
    power_kw: 10,
    has_storage: false,
    efficiency_class: "A++",
  },
  costs: {
    total_estimated_cost: 12000,
  },
};

function almostEqual(a: number, b: number, epsilon = 0.01) {
  assert.ok(Math.abs(a - b) <= epsilon, `Expected ${a} ~ ${b}`);
}

// Caso base
{
  const result = calculateIncentive(baseInput, DEFAULT_GSE_CONFIG);
  // Calcolo atteso (con moltiplicatori):
  // 12000 * 0.55 * 1.1 * 1.2 * 1.1 * 1.05 = 10061.28
  almostEqual(result.raw_incentive, 10061.28);
  almostEqual(result.final_incentive, 10061.28);
  assert.equal(result.payment_mode, "rate_annuali");
  assert.equal(result.payment_years, 2);
}

// Tetto massimo per privato
{
  const input = { ...baseInput, costs: { total_estimated_cost: 50000 } };
  const result = calculateIncentive(input, DEFAULT_GSE_CONFIG);
  assert.equal(result.final_incentive, 15000);
}

// Pagamento in unica soluzione sotto 5000
{
  const input = { ...baseInput, costs: { total_estimated_cost: 4000 } };
  const result = calculateIncentive(input, DEFAULT_GSE_CONFIG);
  assert.equal(result.payment_mode, "unica_soluzione");
  assert.equal(result.payment_years, 2);
  almostEqual(result.annual_payment, result.final_incentive);
}

// Pagamento 5 anni sopra 15000
{
  const input = { ...baseInput, costs: { total_estimated_cost: 40000 }, user_type: "ente_pubblico" };
  const result = calculateIncentive(input, DEFAULT_GSE_CONFIG);
  assert.equal(result.payment_mode, "rate_annuali");
  assert.equal(result.payment_years, 5);
}

console.log("contotermico-calcolo tests: OK");

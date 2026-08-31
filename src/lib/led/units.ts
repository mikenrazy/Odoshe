import type { UnitSystem } from "./types";

const M_TO_FT = 3.280839895;

export function metresToFeet(m: number) {
  return m * M_TO_FT;
}

export function feetToMetres(ft: number) {
  return ft / M_TO_FT;
}

/** convert a stored metric value into the active display unit */
export function toDisplay(metres: number, units: UnitSystem) {
  return units === "imperial" ? metresToFeet(metres) : metres;
}

/** convert a value typed in the active display unit back to metres */
export function fromDisplay(value: number, units: UnitSystem) {
  return units === "imperial" ? feetToMetres(value) : value;
}

export function unitSuffix(units: UnitSystem) {
  return units === "imperial" ? "ft" : "m";
}

/** e.g. 4.27 m  /  14' 0" */
export function formatLength(metres: number, units: UnitSystem, digits = 2) {
  if (units === "imperial") {
    const totalInches = metres * 39.3700787;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches - feet * 12;
    return `${feet}' ${inches.toFixed(0)}"`;
  }
  return `${metres.toFixed(digits)} m`;
}

export function formatArea(squareMetres: number, units: UnitSystem) {
  if (units === "imperial") return `${(squareMetres * 10.7639104).toFixed(1)} ft²`;
  return `${squareMetres.toFixed(2)} m²`;
}

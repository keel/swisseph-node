/**
 * Minimal TypeScript declarations for swisseph-node.
 */

export interface CalcResult {
  lon: number; lat: number; dist: number;
  lonSpeed: number; latSpeed: number; distSpeed: number;
  rflag: number; warning?: string;
}

export interface HousesResult {
  cusps: number[];   // 12 (or 36 for G/K systems)
  ascmc: number[];   // [asc, mc, armc, vertex, equasc, coasc1, polasc, ...]
}

export interface PlanetInfo {
  id: number; key: string; glyph: string; color: string;
  lon: number; lonFormatted: string; lat: number; distance: number;
  speed: number; retrograde: boolean;
  sign: string; signIndex: number; signGlyph: string;
  element: string; mode: string;
  degreeInSign: number; house: number; isAngle: boolean;
}

export interface ChartInput {
  year: number; month: number; day: number;
  hour?: number; minute?: number; second?: number;
  tz?: number | null;  // offset hours east of GMT; null/omit => fields are UTC
  lat: number; lon: number;
  houseSystem?: string;
  planets?: string[];
  aspects?: boolean;
  flags?: number;
}

export interface Chart {
  julianDay: number; deltaT: number; ayanamsa: number;
  houseSystem: string;
  houses: {
    cusps: number[]; cuspsFormatted: string[]; keys: string[];
    ascendant: object; midheaven: object; vertex: number;
  };
  planets: PlanetInfo[];
  angles: PlanetInfo[];
  aspects: Array<{ a: string; b: string; aspect: { key: string; angle: number; orbDelta: number; nature: string; glyph: string; color: string } }>;
  balances: { elements: Record<string, number>; modes: Record<string, number> };
  version: string;
}

export interface SkyInput {
  year: number; month: number; day: number;
  hour?: number; minute?: number; tz?: number | null;
  lat: number; lon: number; stars?: boolean;
}

export interface SkyBody { key: string; glyph: string; azimuth: number; altitude: number; eclLon: number; illumination?: number; magnitude?: number; }
export interface SkyStar { n: string; zh: string; ra: number; dec: number; mag: number; c: string; azimuth: number; altitude: number; }

export const FLG: { SWIEPH: number; MOSEPH: number; SPEED: number; RADIANS: number; TOPOCTR: number; SIDEREAL: number; DEFAULT: number };
export const BODIES: Record<string, number>;

export function setEphePath(path: string): void;
export function computeChart(input: ChartInput): Chart;
export function computeSynastry(a: ChartInput, b: ChartInput): object;
export function computeSky(input: SkyInput): {
  julianDay: number; siderealTime: number;
  observer: { lat: number; lon: number };
  bodies: SkyBody[]; stars: SkyStar[]; constellationLines: Array<{ a: string; b: string }>;
};
export function angularSeparation(a: number, b: number): number;
export function findAspect(lon1: number, lon2: number, opts?: object): object | null;
export function computeAspects(bodies: Array<{ key: string; lon: number }>, opts?: object): Array<object>;

export const raw: {
  version(): string;
  setEphePath(path: string): void;
  setTopo(lon: number, lat: number, alt: number): void;
  setSidMode(mode: number, t0: number, ayanT0: number): void;
  julDay(year: number, month: number, day: number, hour: number, gregflag: number): number;
  revJul(jd: number, gregflag: number): { year: number; month: number; day: number; hour: number };
  utcToJd(y: number, m: number, d: number, h: number, mi: number, s: number, gregflag: number): { jdEt: number; jdUt: number };
  utcTimeZone(y: number, m: number, d: number, h: number, mi: number, s: number, tzHours: number): { year: number; month: number; day: number; hour: number; minute: number; second: number };
  deltat(jdUt: number): number;
  calcUt(jdUt: number, planet: number, flags: number): CalcResult;
  houses(jdUt: number, lat: number, lon: number, hsys: string, flags?: number): HousesResult;
  getPlanetName(ipl: number): string;
  ayanamsaUt(jdUt: number): number;
  azAlt(jdUt: number, calcFlag: number, geopos: number[], atpress: number, attemp: number, xin: number[]): { azimuthTrue: number; altitude: number; azimuthApparent: number };
  phenoUt(jdUt: number, ipl: number, flags: number): object;
  solEclipseWhenLoc(jdStart: number, flags: number, geopos: number[]): object | null;
  lunOccultWhenLoc(jdStart: number, ipl: number, flags: number, geopos: number[]): object | null;
  close(): void;
};

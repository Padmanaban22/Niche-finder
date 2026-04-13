// Shorts RPM estimates based on user specifications:
// US > 0.20$
// AU > 0.15$
// UK > 0.10$
// IN < 0.10$ (we will use 0.05$ as a placeholder for <0.10)

export const SHORTS_RPM_MAP: Record<string, number> = {
  US: 0.20,
  AU: 0.15,
  GB: 0.10, // GB for UK
  IN: 0.05,
};

export const DEFAULT_SHORTS_RPM = 0.08;

export function getEstimatedRPM(countryCode?: string): number {
  if (!countryCode) return DEFAULT_SHORTS_RPM;
  return SHORTS_RPM_MAP[countryCode.toUpperCase()] || DEFAULT_SHORTS_RPM;
}

export function estimateShortsRevenue(avgViews: number, countryCode?: string): number {
  const rpm = getEstimatedRPM(countryCode);
  return (avgViews * rpm) / 1000;
}

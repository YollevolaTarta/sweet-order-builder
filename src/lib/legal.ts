export const LEGAL_VERSION = "1.0";
// null mientras no se publique; el día de la publicación se pondrá la fecha real (p. ej. "15 de diciembre de 2026").
export const LEGAL_EN_VIGOR_DESDE: string | null = null;
export const lineaVersionLegal = () =>
  `Versión ${LEGAL_VERSION} · en vigor desde ${LEGAL_EN_VIGOR_DESDE ?? "pendiente de publicación"}`;

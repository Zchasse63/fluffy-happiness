/*
 * Project-wide constants.
 *
 * Meridian is single-tenant for now — `STUDIO_ID` lives here so adding
 * multi-tenant support later means changing one file (and the resolver
 * to derive it from the authenticated profile).
 */

export const STUDIO_ID = "11111111-1111-1111-1111-111111111111";

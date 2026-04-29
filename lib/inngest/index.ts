export { inngest } from "./client";
import { briefingOnRequest, dailyBriefing } from "./briefing";
import { hourlySync, syncOnRequest } from "./sync";

export const inngestFunctions = [
  dailyBriefing,
  briefingOnRequest,
  hourlySync,
  syncOnRequest,
];

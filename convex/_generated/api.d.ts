/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as accounts from "../accounts.js";
import type * as annotations from "../annotations.js";
import type * as auth from "../auth.js";
import type * as boxes from "../boxes.js";
import type * as collaboration from "../collaboration.js";
import type * as crons from "../crons.js";
import type * as freeLimits from "../freeLimits.js";
import type * as http from "../http.js";
import type * as images from "../images.js";
import type * as labels from "../labels.js";
import type * as marketing from "../marketing.js";
import type * as marketingFiles from "../marketingFiles.js";
import type * as marketingSchema from "../marketingSchema.js";
import type * as masks from "../masks.js";
import type * as media from "../media.js";
import type * as metadata from "../metadata.js";
import type * as projectAccess from "../projectAccess.js";
import type * as projectSetup from "../projectSetup.js";
import type * as projects from "../projects.js";
import type * as r2 from "../r2.js";
import type * as r2Cleanup from "../r2Cleanup.js";
import type * as r2Client from "../r2Client.js";
import type * as r2Diagnostics from "../r2Diagnostics.js";
import type * as r2Records from "../r2Records.js";
import type * as securityEmail from "../securityEmail.js";
import type * as services from "../services.js";
import type * as sessions from "../sessions.js";
import type * as storageRequestEmail from "../storageRequestEmail.js";
import type * as storageRequests from "../storageRequests.js";
import type * as tracks from "../tracks.js";
import type * as trash from "../trash.js";
import type * as trashCleanup from "../trashCleanup.js";
import type * as trial from "../trial.js";
import type * as trialHistory from "../trialHistory.js";
import type * as trialHistoryHelpers from "../trialHistoryHelpers.js";
import type * as usage from "../usage.js";
import type * as v2 from "../v2.js";
import type * as v2Values from "../v2Values.js";
import type * as visibility from "../visibility.js";
import type * as workspaceGroups from "../workspaceGroups.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  accounts: typeof accounts;
  annotations: typeof annotations;
  auth: typeof auth;
  boxes: typeof boxes;
  collaboration: typeof collaboration;
  crons: typeof crons;
  freeLimits: typeof freeLimits;
  http: typeof http;
  images: typeof images;
  labels: typeof labels;
  marketing: typeof marketing;
  marketingFiles: typeof marketingFiles;
  marketingSchema: typeof marketingSchema;
  masks: typeof masks;
  media: typeof media;
  metadata: typeof metadata;
  projectAccess: typeof projectAccess;
  projectSetup: typeof projectSetup;
  projects: typeof projects;
  r2: typeof r2;
  r2Cleanup: typeof r2Cleanup;
  r2Client: typeof r2Client;
  r2Diagnostics: typeof r2Diagnostics;
  r2Records: typeof r2Records;
  securityEmail: typeof securityEmail;
  services: typeof services;
  sessions: typeof sessions;
  storageRequestEmail: typeof storageRequestEmail;
  storageRequests: typeof storageRequests;
  tracks: typeof tracks;
  trash: typeof trash;
  trashCleanup: typeof trashCleanup;
  trial: typeof trial;
  trialHistory: typeof trialHistory;
  trialHistoryHelpers: typeof trialHistoryHelpers;
  usage: typeof usage;
  v2: typeof v2;
  v2Values: typeof v2Values;
  visibility: typeof visibility;
  workspaceGroups: typeof workspaceGroups;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};

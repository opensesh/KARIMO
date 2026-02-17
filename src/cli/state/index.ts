/**
 * KARIMO State Module
 *
 * Manages CLI state and project phase detection.
 */

// Types
export type {
  KarimoLevel,
  PRDSection,
  ProjectPhase,
  KarimoState,
  PRDMetadata,
  PRDFileInfo,
} from './types'

export { DEFAULT_STATE } from './types'

// Schema
export {
  KarimoLevelSchema,
  PRDSectionSchema,
  KarimoStateSchema,
  PRDMetadataSchema,
} from './schema'

// Errors
export {
  KarimoStateError,
  StateCorruptedError,
  StateWriteError,
  PRDMetadataError,
} from './errors'

// Loader
export {
  getStatePath,
  getKarimoDirPath,
  karimoDirExists,
  stateExists,
  loadState,
  saveState,
  updateState,
  resetState,
  setCurrentPRD,
  clearCurrentPRD,
  markOnboarded,
  recordDoctorRun,
  isOnboarded,
} from './loader'

// Detector
export {
  configExists,
  prdsDirExists,
  listPRDFiles,
  extractPRDSlug,
  parsePRDMetadata,
  isPRDFinalized,
  getPRDFileInfos,
  getCurrentPRDSection,
  detectProjectPhase,
  getNextPRDNumber,
} from './detector'

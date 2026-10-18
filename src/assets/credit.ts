/** One credited source file, for the credits screen (Appendix G §8.2, H §12.5). */
export interface Credit {
  pack: string;
  file: string;
  authors: string[];
  licenses: string[];
  urls: string[];
  /** The credit text, when the pack credits in prose rather than per-file fields. */
  text?: string;
}

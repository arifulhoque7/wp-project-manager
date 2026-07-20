// Typed process.env for the QA_* knobs the suite reads (utils/testData.ts).
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CI?: string;
      QA_BASE_URL?: string;
      QA_ADMIN_USERNAME?: string;
      QA_ADMIN_PASSWORD?: string;
    }
  }
}
export {};

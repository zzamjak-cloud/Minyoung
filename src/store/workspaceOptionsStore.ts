import { create } from "zustand";

type WorkspaceOptionsState = {
  jobFunctions: string[];
  jobTitles: string[];
  jobCategories: string[];
  jobDetails: string[];
};

type WorkspaceOptionsActions = {
  setOptions: (opts: Partial<WorkspaceOptionsState>) => void;
  addJobFunction: (value: string) => void;
  removeJobFunction: (value: string) => void;
  addJobTitle: (value: string) => void;
  removeJobTitle: (value: string) => void;
  addJobCategory: (value: string) => void;
  removeJobCategory: (value: string) => void;
  addJobDetail: (value: string) => void;
  removeJobDetail: (value: string) => void;
  clear: () => void;
};

function addUnique(values: string[], value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || values.includes(trimmed)) return values;
  return [...values, trimmed];
}

export const useWorkspaceOptionsStore = create<WorkspaceOptionsState & WorkspaceOptionsActions>()(
  (set) => ({
    jobFunctions: [],
    jobTitles: [],
    jobCategories: [],
    jobDetails: [],
    setOptions: (opts) => set((state) => ({ ...state, ...opts })),
    addJobFunction: (value) =>
      set((state) => ({ jobFunctions: addUnique(state.jobFunctions, value) })),
    removeJobFunction: (value) =>
      set((state) => ({ jobFunctions: state.jobFunctions.filter((item) => item !== value) })),
    addJobTitle: (value) =>
      set((state) => ({ jobTitles: addUnique(state.jobTitles, value) })),
    removeJobTitle: (value) =>
      set((state) => ({ jobTitles: state.jobTitles.filter((item) => item !== value) })),
    addJobCategory: (value) =>
      set((state) => ({ jobCategories: addUnique(state.jobCategories, value) })),
    removeJobCategory: (value) =>
      set((state) => ({ jobCategories: state.jobCategories.filter((item) => item !== value) })),
    addJobDetail: (value) =>
      set((state) => ({ jobDetails: addUnique(state.jobDetails, value) })),
    removeJobDetail: (value) =>
      set((state) => ({ jobDetails: state.jobDetails.filter((item) => item !== value) })),
    clear: () =>
      set({
        jobFunctions: [],
        jobTitles: [],
        jobCategories: [],
        jobDetails: [],
      }),
  }),
);

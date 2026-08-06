import type { DesignValues, ProductCategory, RiskPosture, SeriesFocus, TechnologyPlan } from './types';

export interface DesignDraft {
  seriesId: string;
  codeName: string;
  values: DesignValues;
  technology: TechnologyPlan;
  leadStaffId: string | null;
}

export interface UIModel {
  draft: DesignDraft | null;
  seriesName: string;
  seriesCategory: ProductCategory;
  seriesFocus: SeriesFocus;
  launchProjectId: string | null;
  launchSku: 'flagship' | 'standard' | 'efficient' | 'salvage';
  launchPrice: number;
  launchLife: number;
  launchMarketing: number;
  panelCompact: boolean;
}

export const riskLabels: Record<RiskPosture, string> = { conservative: '保守的', balanced: '標準', aggressive: '攻める' };

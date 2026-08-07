import type { DesignValues, PackageType, ProductCategory, RiskPosture, SeriesFocus, SkuProfile, TechnologyPlan } from '../types';

export interface DesignDraft {
  seriesId: string;
  codeName: string;
  values: DesignValues;
  technology: TechnologyPlan;
  leadStaffId: string | null;
}

export interface InterfaceModel {
  draft: DesignDraft | null;
  seriesName: string;
  seriesCategory: ProductCategory;
  seriesFocus: SeriesFocus;
  launchProjectId: string | null;
  launchSku: SkuProfile;
  launchPrice: number;
  launchLife: number;
  launchMarketing: number;
}

export const createInterfaceModel = (): InterfaceModel => ({
  draft: null,
  seriesName: '',
  seriesCategory: 'cpu',
  seriesFocus: 'balanced',
  launchProjectId: null,
  launchSku: 'standard',
  launchPrice: 50_000,
  launchLife: 78,
  launchMarketing: 3_000_000,
});

export const packageLabels: Record<PackageType, string> = {
  monolithic: 'モノリシック', chiplet: 'チップレット', stacked: '3D積層',
};

export const riskLabels: Record<RiskPosture, string> = {
  conservative: '保守的', balanced: '標準', aggressive: '攻める',
};

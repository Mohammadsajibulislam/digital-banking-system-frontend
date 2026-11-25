export interface SettingsDTO {
  dailyTransferLimit: string;
  maxSingleTransaction: string;
  minAccountBalance: string;
  transferFee: string;
  updatedAt: string;
}
export type UpdateSettingsBody = Omit<SettingsDTO, "updatedAt">;

/**
 * アプリ設定の型定義
 */
export interface AppConfig {
  appId: string;
  name: string;
  nameEn: string;
}

/**
 * 登録済みアプリの静的設定
 * バックエンドはappIdの検証を行わないため、フロントエンドで管理
 */
export const appsConfig: AppConfig[] = [
  {
    appId: "app1",
    name: "アプリ1",
    nameEn: "App 1",
  },
  {
    appId: "app2",
    name: "アプリ2",
    nameEn: "App 2",
  },
];

/**
 * appIdからアプリ設定を取得
 * @returns アプリ設定、見つからない場合はundefined
 */
export function getAppConfig(appId: string): AppConfig | undefined {
  return appsConfig.find((app) => app.appId === appId);
}

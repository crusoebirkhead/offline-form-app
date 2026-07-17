import {
  documentDirectory,
  makeDirectoryAsync,
  copyAsync,
} from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const WEBVIEW_DIR = documentDirectory + 'webview/';

interface WebViewAsset {
  module: number;
  dest: string;
}

const ASSETS: WebViewAsset[] = [
  { module: require('../../assets/webview/form-shell.html'), dest: 'form-shell.html' },
  { module: require('../../assets/webview/formio-theme.css'), dest: 'formio-theme.css' },
  { module: require('../../assets/webview/assets/formio.form.min.css'), dest: 'assets/formio.form.min.css' },
  { module: require('../../assets/webview/assets/formio.form.min.js.txt'), dest: 'assets/formio.form.min.js' },
  { module: require('../../assets/webview/assets/formio-standard-template.js.txt'), dest: 'assets/formio-standard-template.js' },
  // flatpickr (datetime/calendar) bundled locally so it works offline instead of
  // being fetched from cdn.form.io at runtime.
  { module: require('../../assets/webview/assets/flatpickr.min.js.txt'), dest: 'assets/flatpickr.min.js' },
  { module: require('../../assets/webview/assets/flatpickr.min.css'), dest: 'assets/flatpickr.min.css' },
  {
    module: require('../../assets/webview/assets/fonts/bootstrap-icons.woff2'),
    dest: 'assets/fonts/bootstrap-icons.woff2',
  },
  {
    module: require('../../assets/webview/assets/fonts/bootstrap-icons.woff'),
    dest: 'assets/fonts/bootstrap-icons.woff',
  },
  {
    module: require('../../assets/webview/assets/fonts/Inter-Regular.woff2'),
    dest: 'assets/fonts/Inter-Regular.woff2',
  },
  {
    module: require('../../assets/webview/assets/fonts/Inter-Medium.woff2'),
    dest: 'assets/fonts/Inter-Medium.woff2',
  },
  {
    module: require('../../assets/webview/assets/fonts/Inter-SemiBold.woff2'),
    dest: 'assets/fonts/Inter-SemiBold.woff2',
  },
  {
    module: require('../../assets/webview/assets/fonts/Inter-Bold.woff2'),
    dest: 'assets/fonts/Inter-Bold.woff2',
  },
];

/**
 * Copies the WebView form shell and its assets from the app bundle into the
 * document directory so react-native-webview can load them via file:// URIs.
 * This is idempotent — once the directory exists the call returns immediately.
 */
export async function setupWebViewAssets(): Promise<string> {
  await makeDirectoryAsync(WEBVIEW_DIR + 'assets/fonts', { intermediates: true });

  for (const assetDef of ASSETS) {
    const asset = Asset.fromModule(assetDef.module);
    await asset.downloadAsync();
    if (!asset.localUri) {
      throw new Error(`Failed to load asset for ${assetDef.dest}`);
    }
    await copyAsync({
      from: asset.localUri,
      to: WEBVIEW_DIR + assetDef.dest,
    });
  }

  return WEBVIEW_DIR;
}

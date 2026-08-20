import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Opens a native URL when its handler is available, then falls back to the
 * same HTTPS destination in the in-app browser. Known public URLs should not
 * show an error alert merely because Android has no matching app installed.
 */
export async function openExternalUrl(url: string, fallbackUrl = url): Promise<boolean> {
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // Try the browser fallback below.
  }

  try {
    if (await Linking.canOpenURL(fallbackUrl)) {
      await Linking.openURL(fallbackUrl);
      return true;
    }
  } catch {
    // Try the in-app browser fallback below.
  }

  try {
    await WebBrowser.openBrowserAsync(fallbackUrl);
    return true;
  } catch {
    return false;
  }
}
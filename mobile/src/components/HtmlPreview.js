import React from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

/** Renders an HTML string: WebView on iOS/Android (Expo Go), iframe on web. */
export default function HtmlPreview({ html, style }) {
  if (Platform.OS === 'web') {
    return (
      <View style={style}>
        {React.createElement('iframe', { srcDoc: html, style: { border: 0, width: '100%', height: '100%', background: '#fff' }, title: 'Certificate preview' })}
      </View>
    );
  }
  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={[{ backgroundColor: '#fff' }, style]}
      scalesPageToFit
      setBuiltInZoomControls
      nestedScrollEnabled
    />
  );
}

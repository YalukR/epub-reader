package com.example.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    normalizeIncomingIntent(getIntent());
    super.onCreate(savedInstanceState);
  }

  @Override
  public void onNewIntent(Intent intent) {
    normalizeIncomingIntent(intent);
    super.onNewIntent(intent);
  }

  /**
   * WhatsApp, Gmail, etc. mandan el archivo como ACTION_SEND con el uri
   * en EXTRA_STREAM. @capacitor/app solo entiende ACTION_VIEW con
   * setData(uri), así que normalizamos ambos casos aquí antes de que
   * el bridge los procese.
   */
  private void normalizeIncomingIntent(Intent intent) {
    if (intent == null) return;

    if (Intent.ACTION_SEND.equals(intent.getAction())) {
      Uri sharedUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
      if (sharedUri != null) {
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(sharedUri);
      }
    }
  }
}
import { parsePairingPayload } from '@rejtek/core';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { createStyles } from '../../theme/useTheme';
import { Group } from '../../ui/Group';
import { PillButton } from '../../ui/PillButton';
import { Screen } from '../../ui/Screen';

export default function ScanScreen() {
  const styles = useStyles();
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  const onScanned = (data: string) => {
    if (handled.current) {
      return;
    }
    try {
      parsePairingPayload(data);
      handled.current = true;
      router.replace({ pathname: '/pair/confirm', params: { code: data } });
    } catch {
      setError(t.scan.notACode);
    }
  };

  return (
    <Screen onBack={router.back} title={t.scan.title} subtitle={t.scan.subtitle}>
      <View style={styles.camera}>
        {permission?.granted ? (
          <CameraView
            style={styles.fill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              onScanned(data);
            }}
          />
        ) : (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>{t.scan.cameraReason}</Text>
            {permission && (
              <View style={styles.permissionButton}>
                <PillButton label={t.scan.allowCamera} onPress={() => void requestPermission()} />
              </View>
            )}
          </View>
        )}
      </View>
      {error !== null && <Text style={styles.error}>{error}</Text>}
      <Group>
        <View style={styles.steps}>
          {t.scan.steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </Group>
      <Text style={styles.hint}>{t.scan.wifiHint}</Text>
    </Screen>
  );
}

const useStyles = createStyles((t) => ({
  camera: { height: 340, borderRadius: 28, overflow: 'hidden', backgroundColor: '#0B0C0E' },
  fill: { flex: 1 },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  permissionText: { color: '#D5D8DD', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permissionButton: { flexDirection: 'row', width: 220 },
  error: { paddingHorizontal: 8, fontSize: 14, color: t.colors.danger },
  steps: { padding: 18, gap: 12 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentTint,
  },
  stepNumberText: { fontSize: 13, fontWeight: '700', color: t.colors.accent },
  stepText: { flex: 1, fontSize: 15, lineHeight: 21, color: t.colors.ink, paddingTop: 2 },
  hint: { paddingHorizontal: 8, fontSize: 13, color: t.colors.muted },
}));

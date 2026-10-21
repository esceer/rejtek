import { avatarLetter, avatarTint } from '@rejtek/core';
import { StyleSheet, Text, View } from 'react-native';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: avatarTint(name) },
      ]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{avatarLetter(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFFFFF', fontWeight: '700' },
});

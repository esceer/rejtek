import { Redirect, useLocalSearchParams } from 'expo-router';

/** Deep link target: `rejtek://pair?p=…` (what the pairing QR code contains). */
export default function PairLink() {
  const { p } = useLocalSearchParams<{ p?: string }>();
  return <Redirect href={{ pathname: '/pair/confirm', params: { code: p ?? '' } }} />;
}

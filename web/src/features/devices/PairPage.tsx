import { encodePairingPayload, type PairingTokenResponse } from '@rejtek/core';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { cx } from '../../lib/cx';
import { useNow } from '../../lib/useNow';
import { Alert } from '../../ui/Alert';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ClockIcon } from '../../ui/icons';
import { useCreatePairingToken } from './useDevices';

const STEPS = [
  { title: 'Open Rejtek on your phone', text: 'Make sure the phone is on the home Wi-Fi.' },
  { title: 'Settings → Connect to server', text: 'The camera opens.' },
  { title: 'Scan this code', text: 'Then enter your master password once on the phone.' },
];

export function PairPage() {
  const pairing = useCreatePairingToken();
  const { mutate } = pairing;

  useEffect(() => {
    mutate();
  }, [mutate]);

  return (
    <>
      <Link to="/devices" className="text-sm text-accent no-underline">
        ← Devices
      </Link>
      <h1 className="mt-2 mb-6 text-[28px] font-bold tracking-tight">Pair a phone</h1>

      <div className="flex flex-wrap items-stretch gap-5">
        <Card className="flex min-w-0 flex-[1_1_340px] flex-col items-center gap-4.5 p-7">
          {pairing.isError && <Alert tone="danger">Could not create a pairing code.</Alert>}
          {pairing.data ? (
            <PairingCode pairing={pairing.data} />
          ) : (
            <div className="size-[260px] animate-pulse rounded-2xl bg-field" />
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={pairing.isPending}
            onClick={() => {
              mutate();
            }}
          >
            Generate a new code
          </Button>
        </Card>

        <Card className="flex min-w-0 flex-[999_1_420px] flex-col gap-5 p-7">
          <h2 className="text-lg font-bold">On your phone</h2>
          <ol className="flex flex-col gap-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex items-start gap-3.5">
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent-soft-ink">
                  {index + 1}
                </span>
                <div>
                  <div className="text-[15px] font-semibold">{step.title}</div>
                  <div className="mt-0.5 text-sm leading-normal text-muted">{step.text}</div>
                </div>
              </li>
            ))}
          </ol>
          {pairing.data?.certificateFingerprint && (
            <div className="mt-auto rounded-[10px] bg-field px-4 py-3.5 text-[13px] leading-relaxed text-muted">
              The phone checks that it is talking to this server using its certificate fingerprint:
              <div className="font-mono break-all text-ink">
                {pairing.data.certificateFingerprint}
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function PairingCode({ pairing }: { pairing: PairingTokenResponse }) {
  const now = useNow();
  const secondsLeft = Math.max(0, Math.round((Date.parse(pairing.expiresAt) - now) / 1_000));
  const expired = secondsLeft === 0;
  const payload = encodePairingPayload({
    v: 1,
    url: window.location.origin,
    token: pairing.token,
    fingerprint: pairing.certificateFingerprint,
  });

  return (
    <>
      {/* Always dark-on-white, also in dark mode, so every camera can read it. */}
      <div
        className={cx(
          'rounded-2xl border border-[#E3E6EB] bg-white p-4',
          expired && 'opacity-20 blur-[2px]',
        )}
      >
        <QRCodeSVG
          value={payload}
          size={224}
          level="M"
          bgColor="#FFFFFF"
          fgColor="#111827"
          role="img"
          aria-label="Pairing QR code"
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
        <ClockIcon size={16} />
        {expired ? (
          'Code expired'
        ) : (
          <span>
            Expires in{' '}
            <strong className="text-ink">
              {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
            </strong>{' '}
            · works once
          </span>
        )}
      </div>
    </>
  );
}

import { formatDate, type Device } from '@rejtek/core';
import { Link } from 'react-router';
import { Alert } from '../../ui/Alert';
import { buttonClass } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmButton } from '../../ui/ConfirmButton';
import { BrowserIcon, PhoneIcon, QrIcon } from '../../ui/icons';
import { useDevices, useRevokeDevice } from './useDevices';

const KIND_LABELS = { phone: 'Phone app', extension: 'Browser extension' } as const;

export function DevicesPage() {
  const devices = useDevices();

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Devices</h1>
          <p className="mt-1 text-sm text-muted">
            Phones and browser extensions that can sync with your vault.
          </p>
        </div>
        <Link to="/devices/pair" className={buttonClass()}>
          <QrIcon size={16} />
          Pair a phone
        </Link>
      </div>

      {devices.isError && <Alert tone="danger">Could not load your devices.</Alert>}

      <Card className="overflow-hidden">
        {devices.isPending && <p className="p-5 text-sm text-muted">Loading…</p>}
        {devices.data?.length === 0 && (
          <p className="p-5 text-sm text-muted">No devices paired yet.</p>
        )}
        <ul className="divide-y divide-line">
          {devices.data?.map((device) => (
            <DeviceRow key={device.id} device={device} />
          ))}
        </ul>
      </Card>
      <p className="mx-1 mt-3.5 text-[13px] leading-normal text-muted">
        Revoking stops a device from syncing. Passwords already on that device stay there until the
        app is removed.
      </p>
    </>
  );
}

function DeviceRow({ device }: { device: Device }) {
  const revoke = useRevokeDevice();
  const KindIcon = device.kind === 'phone' ? PhoneIcon : BrowserIcon;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-field">
        <KindIcon size={20} />
      </span>
      <div className="min-w-0 flex-[1_1_240px]">
        <div className="text-[15px] font-semibold">{device.name}</div>
        <div className="mt-0.5 text-[13px] text-muted">
          {KIND_LABELS[device.kind]} · paired {formatDate(device.createdAt)}
        </div>
      </div>
      <div className="flex-[0_1_220px] text-[13px] text-muted">
        Last used {formatDate(device.lastUsedAt)}
      </div>
      <ConfirmButton
        label="Revoke"
        confirmLabel="Yes, revoke"
        prompt={`Revoke ${device.name}?`}
        pending={revoke.isPending}
        onConfirm={() => {
          revoke.mutate(device.id);
        }}
      />
    </li>
  );
}

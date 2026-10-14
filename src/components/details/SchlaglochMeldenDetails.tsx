import type { SchlaglochMelden } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { MapRouteLinks } from '@/components/widgets/MapWidget';
import { usePermissions } from '@/lib/permissions';

export interface SchlaglochMeldenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: SchlaglochMelden;
}

export function SchlaglochMeldenDetails({
  record,
}: SchlaglochMeldenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('schlagloch_melden', 'standort')}>
          {record.fields.standort ? (
            <div className="space-y-1">
              <div>{record.fields.standort.info ?? `${record.fields.standort.lat}, ${record.fields.standort.long}`}</div>
              {/* Directions links — the map popup is hover-fleeting; the overlay
                  is the only mobile-reachable place for navigation. */}
              <MapRouteLinks lat={record.fields.standort.lat} long={record.fields.standort.long} />
            </div>
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('schlagloch_melden', 'schweregrad')} value={record.fields.schweregrad} format="pill" />
        <RecordField label={fieldLabel('schlagloch_melden', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('schlagloch_melden', 'foto')} className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('schlagloch_melden', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('schlagloch_melden', 'meldedatum')} value={record.fields.meldedatum} format="datetime" />
        <RecordField label={fieldLabel('schlagloch_melden', 'strasse')} value={record.fields.strasse} format="text" />
        <RecordField label={fieldLabel('schlagloch_melden', 'hausnummer')} value={record.fields.hausnummer} format="text" />
        <RecordField label={fieldLabel('schlagloch_melden', 'postleitzahl')} value={record.fields.postleitzahl} format="text" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.SCHLAGLOCH_MELDEN} recordId={record.record_id} readOnly={!perms.canWrite('schlagloch_melden')} />
    </>
  );
}

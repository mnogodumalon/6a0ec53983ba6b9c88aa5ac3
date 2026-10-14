import { useDashboardData } from '@/hooks/useDashboardData';
import type { SchlaglochMelden } from '@/types/app';
import { LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SchlaglochMeldenDialog } from '@/components/dialogs/SchlaglochMeldenDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck, IconPlus,
  IconMapPin, IconCalendar, IconTrash, IconPencil,
  IconAlertTriangle, IconCircleCheck, IconFlag, IconPhoto,
} from '@tabler/icons-react';
import { tx } from '@/i18n';

const APPGROUP_ID = '6a0ec53983ba6b9c88aa5ac3';
const REPAIR_ENDPOINT = '/claude/build/repair';

const SCHWEREGRAD_OPTIONS = LOOKUP_OPTIONS['schlagloch_melden']?.schweregrad ?? [];

function schwerBadgeClass(key: string | undefined) {
  if (key === 'hoch') return 'bg-red-100 text-red-700 border-red-200';
  if (key === 'mittel') return 'bg-orange-100 text-orange-700 border-orange-200';
  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
}

function schwerIcon(key: string | undefined) {
  if (key === 'hoch') return <IconAlertTriangle size={14} className="shrink-0 text-red-600" />;
  if (key === 'mittel') return <IconFlag size={14} className="shrink-0 text-orange-500" />;
  return <IconCircleCheck size={14} className="shrink-0 text-yellow-600" />;
}

export default function DashboardOverview() {
  const { schlaglochMelden, loading, error, fetchAll } = useDashboardData();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<SchlaglochMelden | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchlaglochMelden | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState<string>('alle');

  const stats = useMemo(() => {
    const total = schlaglochMelden.length;
    const hoch = schlaglochMelden.filter(r => r.fields.schweregrad?.key === 'hoch').length;
    const mittel = schlaglochMelden.filter(r => r.fields.schweregrad?.key === 'mittel').length;
    const gering = schlaglochMelden.filter(r => r.fields.schweregrad?.key === 'gering').length;
    return { total, hoch, mittel, gering };
  }, [schlaglochMelden]);

  const filtered = useMemo(() => {
    if (filterKey === 'alle') return schlaglochMelden;
    return schlaglochMelden.filter(r => r.fields.schweregrad?.key === filterKey);
  }, [schlaglochMelden, filterKey]);

  const selected = useMemo(() =>
    selectedId ? schlaglochMelden.find(r => r.record_id === selectedId) ?? null : null,
    [schlaglochMelden, selectedId]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await LivingAppsService.deleteSchlaglochMeldenEntry(deleteTarget.record_id);
    if (selectedId === deleteTarget.record_id) setSelectedId(null);
    setDeleteTarget(null);
    fetchAll();
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{tx('Schlagloch-Übersicht')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{stats.total} {tx('Meldungen insgesamt')}</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="shrink-0">
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          {tx('Schlagloch melden')}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title={tx('Gesamt')}
          value={String(stats.total)}
          description={tx('Alle Meldungen')}
          icon={<IconMapPin size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title={tx('Gefährlich')}
          value={String(stats.hoch)}
          description={tx('Schweregrad hoch')}
          icon={<IconAlertTriangle size={18} className="text-red-500" />}
        />
        <StatCard
          title={tx('Mittel')}
          value={String(stats.mittel)}
          description={tx('Schweregrad mittel')}
          icon={<IconFlag size={18} className="text-orange-500" />}
        />
        <StatCard
          title={tx('Gering')}
          value={String(stats.gering)}
          description={tx('Kleine Unebenheiten')}
          icon={<IconCircleCheck size={18} className="text-yellow-500" />}
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'alle', label: tx('Alle') },
          { key: 'hoch', label: tx('Hoch') },
          { key: 'mittel', label: tx('Mittel') },
          { key: 'gering', label: tx('Gering') },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterKey(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filterKey === f.key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {f.label}
            {f.key !== 'alle' && (
              <span className="ml-1.5 opacity-70">
                {schlaglochMelden.filter(r => r.fields.schweregrad?.key === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main Content: List + Detail */}
      <div className="flex gap-5 min-h-0">
        {/* Card List */}
        <div className={`flex-1 min-w-0 ${selected ? 'hidden sm:block sm:w-1/2' : 'w-full'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-border rounded-2xl">
              <IconMapPin size={48} className="text-muted-foreground" stroke={1.5} />
              <p className="text-muted-foreground text-sm">{tx('Keine Meldungen vorhanden')}</p>
              <Button size="sm" variant="outline" onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
                <IconPlus size={14} className="mr-1" />
                {tx('Jetzt melden')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(record => {
                const key = record.fields.schweregrad?.key;
                const label = record.fields.schweregrad?.label ?? '—';
                const isSelected = selectedId === record.record_id;
                return (
                  <div
                    key={record.record_id}
                    onClick={() => setSelectedId(isSelected ? null : record.record_id)}
                    className={`group rounded-2xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Severity indicator */}
                      <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                        key === 'hoch' ? 'bg-red-500' : key === 'mittel' ? 'bg-orange-400' : 'bg-yellow-400'
                      }`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {record.fields.strasse
                              ? `${record.fields.strasse}${record.fields.hausnummer ? ' ' + record.fields.hausnummer : ''}`
                              : tx('Standort nicht angegeben')}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${schwerBadgeClass(key)}`}>
                            {schwerIcon(key)}
                            {label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {record.fields.ort && (
                            <span className="flex items-center gap-1 truncate">
                              <IconMapPin size={12} className="shrink-0" />
                              {record.fields.ort}
                              {record.fields.postleitzahl ? ` (${record.fields.postleitzahl})` : ''}
                            </span>
                          )}
                          {record.fields.meldedatum && (
                            <span className="flex items-center gap-1">
                              <IconCalendar size={12} className="shrink-0" />
                              {formatDate(record.fields.meldedatum)}
                            </span>
                          )}
                          {record.fields.foto && (
                            <span className="flex items-center gap-1 text-primary/70">
                              <IconPhoto size={12} className="shrink-0" />
                              {tx('Foto')}
                            </span>
                          )}
                        </div>

                        {record.fields.beschreibung && (
                          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                            {record.fields.beschreibung}
                          </p>
                        )}
                      </div>

                      {/* Actions — always visible */}
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <button
                          onClick={e => { e.stopPropagation(); setEditRecord(record); setDialogOpen(true); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title={tx('Bearbeiten')}
                        >
                          <IconPencil size={14} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget(record); }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={tx('Löschen')}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-full sm:w-1/2 shrink-0">
            <div className="rounded-2xl border border-border bg-card overflow-hidden sticky top-24">
              {/* Detail header */}
              <div className={`px-5 py-4 flex items-start justify-between gap-3 ${
                selected.fields.schweregrad?.key === 'hoch'
                  ? 'bg-red-50 border-b border-red-100'
                  : selected.fields.schweregrad?.key === 'mittel'
                  ? 'bg-orange-50 border-b border-orange-100'
                  : 'bg-yellow-50 border-b border-yellow-100'
              }`}>
                <div className="min-w-0">
                  <h2 className="font-bold text-base text-foreground truncate">
                    {selected.fields.strasse
                      ? `${selected.fields.strasse}${selected.fields.hausnummer ? ' ' + selected.fields.hausnummer : ''}`
                      : tx('Standort nicht angegeben')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selected.fields.ort ?? ''}{selected.fields.postleitzahl ? ` · ${selected.fields.postleitzahl}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:bg-accent transition-colors text-lg leading-none"
                  title={tx('Schließen')}
                >
                  ×
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* Severity */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border font-medium ${schwerBadgeClass(selected.fields.schweregrad?.key)}`}>
                    {schwerIcon(selected.fields.schweregrad?.key)}
                    {selected.fields.schweregrad?.label ?? '—'}
                  </span>
                </div>

                {/* Photo */}
                {selected.fields.foto && (
                  <div className="rounded-xl overflow-hidden border border-border">
                    <img
                      src={selected.fields.foto}
                      alt={tx('Foto des Schlaglochs')}
                      className="w-full h-48 object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                )}

                {/* Description */}
                {selected.fields.beschreibung && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{tx('Beschreibung')}</p>
                    <p className="text-sm text-foreground">{selected.fields.beschreibung}</p>
                  </div>
                )}

                {/* Meta */}
                <div className="space-y-2">
                  {selected.fields.meldedatum && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconCalendar size={14} className="shrink-0" />
                      <span>{tx('Gemeldet am')} {formatDate(selected.fields.meldedatum)}</span>
                    </div>
                  )}
                  {selected.fields.standort && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconMapPin size={14} className="shrink-0" />
                      <span className="truncate">
                        {selected.fields.standort.info
                          ? selected.fields.standort.info
                          : `${selected.fields.standort.lat.toFixed(5)}, ${selected.fields.standort.long.toFixed(5)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setEditRecord(selected); setDialogOpen(true); }}
                  >
                    <IconPencil size={14} className="mr-1.5 shrink-0" />
                    {tx('Bearbeiten')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setDeleteTarget(selected)}
                  >
                    <IconTrash size={14} className="shrink-0" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <SchlaglochMeldenDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateSchlaglochMeldenEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createSchlaglochMeldenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        recordId={editRecord?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['SchlaglochMelden']}
        enablePhotoLocation={AI_PHOTO_LOCATION['SchlaglochMelden']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={tx('Meldung löschen')}
        description={tx`Soll die Schlagloch-Meldung "${deleteTarget?.fields.strasse ?? tx('dieser Eintrag')}" wirklich gelöscht werden?`}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus(tx('Reparatur wird gestartet...'));
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) { /* i18n-exempt */
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">{tx('Dashboard repariert')}</h3>
          <p className="text-sm text-muted-foreground max-w-xs">{tx('Das Problem wurde behoben. Bitte laden Sie die Seite neu.')}</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />{tx('Neu laden')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">{tx('Fehler beim Laden')}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>{tx('Erneut versuchen')}</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? tx('Reparatur läuft...') : tx('Dashboard reparieren')}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">{tx('Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.')}</p>}
    </div>
  );
}

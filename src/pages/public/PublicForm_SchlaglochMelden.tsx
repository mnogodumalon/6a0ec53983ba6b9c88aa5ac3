import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/DatePicker';
import { IconChevronDown, IconCrosshair, IconLoader2 } from '@tabler/icons-react';
import { GeoMapPicker } from '@/components/GeoMapPicker';
import { lookupKey } from '@/lib/formatters';
import { tx } from '@/i18n';

// Empty PROXY_BASE → relative URLs (dashboard and form-proxy share the domain).
const PROXY_BASE = '';
const APP_ID = '6a0ec52a775fa829a13eba97';
const SUBMIT_PATH = `/rest/apps/${APP_ID}/records`;
const ALTCHA_SCRIPT_SRC = 'https://cdn.jsdelivr.net/npm/altcha/dist/altcha.min.js';

async function submitPublicForm(fields: Record<string, unknown>, captchaToken: string) {
  const res = await fetch(`${PROXY_BASE}/api${SUBMIT_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Captcha-Token': captchaToken,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || tx('Submission failed'));
  }
  return res.json();
}


function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) continue;
    if (typeof value === 'object' && !Array.isArray(value) && 'key' in (value as any)) {
      cleaned[key] = (value as any).key;
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(item =>
        typeof item === 'object' && item !== null && 'key' in item ? item.key : item
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export default function PublicFormSchlaglochMelden() {
  const [fields, setFields] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoFromPhoto, setGeoFromPhoto] = useState(false);
  const [showCoords, setShowCoords] = useState(false);
  const captchaRef = useRef<HTMLElement | null>(null);

  function geoLocate(fieldKey: string) {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: long } = pos.coords;
        setFields(f => ({ ...f, [fieldKey]: { lat, long, info: `${lat.toFixed(5)}, ${long.toFixed(5)}` } }));
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleMapMove(fieldKey: string, lat: number, lng: number) {
    setFields(f => ({ ...f, [fieldKey]: { ...(f[fieldKey] ?? {}), lat, long: lng } }));
  }

  // geoFromPhoto setter exposed for potential future photo upload use
  void setGeoFromPhoto;

  // Load the ALTCHA web component script once per page.
  useEffect(() => {
    if (document.querySelector(`script[src="${ALTCHA_SCRIPT_SRC}"]`)) return;
    const s = document.createElement('script');
    s.src = ALTCHA_SCRIPT_SRC;
    s.defer = true;
    document.head.appendChild(s);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return;
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const prefill: Record<string, any> = {};
    params.forEach((value, key) => { prefill[key] = value; });
    if (Object.keys(prefill).length) setFields(prev => ({ ...prefill, ...prev }));
  }, []);

  function readCaptchaToken(): string | null {
    const el = captchaRef.current as any;
    if (!el) return null;
    return el.value || el.getAttribute('value') || null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = readCaptchaToken();
    if (!token) {
      setError(tx('Bitte warte auf die Spam-Prüfung und versuche es erneut.'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicForm(cleanFields(fields), token);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || tx('Etwas ist schiefgelaufen. Bitte versuche es erneut.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">{tx('Vielen Dank!')}</h2>
          <p className="text-muted-foreground">{tx('Deine Eingabe wurde erfolgreich übermittelt.')}</p>
          <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setFields({}); }}>
            {tx('Weitere Eingabe')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">{tx('Schlagloch melden — Formular')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-xl border border-border p-6 shadow-md">
          <div className="space-y-2">
            <Label htmlFor="standort">{tx('Genaue Position des Schlaglochs')}</Label>
            <div className="space-y-3">
              <Button type="button" variant="outline" className="w-full" disabled={locating} onClick={() => geoLocate("standort")}>
                {locating ? <IconLoader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <IconCrosshair className="h-4 w-4 mr-1.5" />}
                {tx('Aktuellen Standort verwenden')}
              </Button>
              {geoFromPhoto && fields.standort && (
                <p className="text-xs text-primary italic">{tx('Standort aus Foto übernommen')}</p>
              )}
              {fields.standort?.info && (
                <p className="text-sm text-muted-foreground break-words whitespace-normal">
                  {fields.standort.info}
                </p>
              )}
              {fields.standort?.lat != null && fields.standort?.long != null && (
                <GeoMapPicker
                  lat={fields.standort.lat}
                  lng={fields.standort.long}
                  onChange={(lat, lng) => handleMapMove("standort", lat, lng)}
                />
              )}
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors" onClick={() => setShowCoords(v => !v)}>
                {showCoords ? tx('Koordinaten verbergen') : tx('Koordinaten anzeigen')}
                <IconChevronDown className={`h-3 w-3 transition-transform ${showCoords ? "rotate-180" : ""}`} />
              </button>
              {showCoords && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{tx('Breitengrad')}</Label>
                    <Input type="number" step="any"
                      value={fields.standort?.lat ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, standort: { ...(f.standort as any ?? {}), lat: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{tx('Längengrad')}</Label>
                    <Input type="number" step="any"
                      value={fields.standort?.long ?? ''}
                      onChange={e => {
                        const v = e.target.value;
                        setFields(f => ({ ...f, standort: { ...(f.standort as any ?? {}), long: v ? Number(v) : undefined } }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schweregrad">{tx('Schweregrad')}</Label>
            <div role="radiogroup" className="flex flex-wrap gap-1.5">
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schweregrad) === 'gering'}
                onClick={() => setFields(f => ({ ...f, schweregrad: (lookupKey(f.schweregrad) === 'gering' ? undefined : 'gering') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schweregrad) === 'gering'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                {tx('Gering (kleine Unebenheit)')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schweregrad) === 'mittel'}
                onClick={() => setFields(f => ({ ...f, schweregrad: (lookupKey(f.schweregrad) === 'mittel' ? undefined : 'mittel') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schweregrad) === 'mittel'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                {tx('Mittel (deutliche Vertiefung)')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={lookupKey(fields.schweregrad) === 'hoch'}
                onClick={() => setFields(f => ({ ...f, schweregrad: (lookupKey(f.schweregrad) === 'hoch' ? undefined : 'hoch') as any }))}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  lookupKey(fields.schweregrad) === 'hoch'
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-background text-foreground border-input hover:bg-accent'
                }`}
              >
                {tx('Hoch (tiefes Schlagloch, gefährlich)')}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">{tx('Zusätzliche Beschreibung')}</Label>
            <Textarea
              id="beschreibung"
              placeholder=""
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ort">{tx('Ort')}</Label>
            <Input
              id="ort"
              placeholder=""
              value={fields.ort ?? ''}
              onChange={e => setFields(f => ({ ...f, ort: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meldedatum">{tx('Meldedatum und -uhrzeit')}</Label>
            <DatePicker
              id="meldedatum"
              placeholder=""
              mode="datetime"
              value={fields.meldedatum ?? null}
              onChange={v => setFields(f => ({ ...f, meldedatum: v ?? undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strasse">{tx('Straße')}</Label>
            <Input
              id="strasse"
              placeholder=""
              value={fields.strasse ?? ''}
              onChange={e => setFields(f => ({ ...f, strasse: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hausnummer">{tx('Hausnummer / Abschnitt')}</Label>
            <Input
              id="hausnummer"
              placeholder=""
              value={fields.hausnummer ?? ''}
              onChange={e => setFields(f => ({ ...f, hausnummer: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postleitzahl">{tx('Postleitzahl')}</Label>
            <Input
              id="postleitzahl"
              placeholder=""
              value={fields.postleitzahl ?? ''}
              onChange={e => setFields(f => ({ ...f, postleitzahl: e.target.value }))}
            />
          </div>

          <altcha-widget
            ref={captchaRef as any}
            challengeurl={`${PROXY_BASE}/api/_challenge?path=${encodeURIComponent(SUBMIT_PATH)}`}
            auto="onsubmit"
            hidefooter
          />

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? tx('Wird gesendet...') : tx('Absenden')}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {tx('Powered by Klar')}
        </p>
      </div>
    </div>
  );
}

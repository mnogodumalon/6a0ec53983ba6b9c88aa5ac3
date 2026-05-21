// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface SchlaglochMelden {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    standort?: GeoLocation; // { lat, long, info }
    schweregrad?: LookupValue;
    beschreibung?: string;
    foto?: string;
    ort?: string;
    meldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    strasse?: string;
    hausnummer?: string;
    postleitzahl?: string;
  };
}

export const APP_IDS = {
  SCHLAGLOCH_MELDEN: '6a0ec52a775fa829a13eba97',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'schlagloch_melden': {
    schweregrad: [{ key: "gering", label: "Gering (kleine Unebenheit)" }, { key: "mittel", label: "Mittel (deutliche Vertiefung)" }, { key: "hoch", label: "Hoch (tiefes Schlagloch, gefährlich)" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'schlagloch_melden': {
    'standort': 'geo',
    'schweregrad': 'lookup/radio',
    'beschreibung': 'string/textarea',
    'foto': 'file',
    'ort': 'string/text',
    'meldedatum': 'date/datetimeminute',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'postleitzahl': 'string/text',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateSchlaglochMelden = StripLookup<SchlaglochMelden['fields']>;
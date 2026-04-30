export interface CachedFormSchema {
  id: string;
  form_path: string;
  title: string;
  json_schema: string;
  version: string;
  updated_at: string;
}

export type EntryStatus = 'draft' | 'completed' | 'sent';

export interface Entry {
  id: string;
  form_type: string;
  form_title: string;
  data_json: string;
  status: EntryStatus;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
}

-- migrate:statement
CREATE TABLE IF NOT EXISTS public.mezzopollo_arcade_intents (
  intent_id uuid PRIMARY KEY,
  request_hash text UNIQUE NOT NULL CHECK (length(request_hash) = 64),
  signature text UNIQUE,
  record jsonb NOT NULL CHECK (record->>'intentId' = intent_id::text),
  CHECK (record->>'status' IN ('pending', 'paid', 'started')),
  CHECK ((record->>'tier' = 'hard' AND record->>'lamports' = '1000000' AND record->>'lives' = '1') OR
    (record->>'tier' = 'medium' AND record->>'lamports' = '2000000' AND record->>'lives' = '3') OR
    (record->>'tier' = 'easy' AND record->>'lamports' = '3000000' AND record->>'lives' = '9') OR
    (record->>'tier' = 'god' AND record->>'lamports' = '10000000' AND record->>'lives' = '32')),
  CHECK ((signature IS NULL AND record->>'status' = 'pending') OR
    (signature IS NOT NULL AND record->>'status' IN ('paid', 'started') AND record->>'signature' = signature))
);
-- migrate:statement
CREATE TABLE IF NOT EXISTS public.mezzopollo_arcade_rate (
  key_hash text PRIMARY KEY CHECK (length(key_hash) = 64),
  window_start timestamptz NOT NULL,
  count integer NOT NULL
);
-- migrate:statement
CREATE OR REPLACE FUNCTION public.mezzopollo_arcade_transition(p_id uuid, p_action text, p_data jsonb)
RETURNS jsonb LANGUAGE plpgsql SET search_path = pg_catalog, public AS $body$
DECLARE current_record jsonb; next_record jsonb; payment_signature text;
BEGIN
  SELECT record INTO current_record FROM public.mezzopollo_arcade_intents WHERE intent_id = p_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'intent_not_found'); END IF;
  next_record := current_record;
  IF p_action = 'prepare' THEN
    IF current_record->>'status' <> 'pending' OR (current_record->>'revision')::integer <> (p_data->>'revision')::integer THEN
      RETURN jsonb_build_object('record', current_record, 'changed', false);
    END IF;
    next_record := next_record || jsonb_build_object('prepared', p_data->'prepared');
  ELSIF p_action = 'paid' THEN
    IF current_record->>'status' <> 'pending' THEN
      IF current_record->>'signature' <> p_data->>'signature' THEN RETURN jsonb_build_object('error', 'payment_conflict'); END IF;
      RETURN jsonb_build_object('record', current_record, 'changed', false);
    END IF;
    payment_signature := p_data->>'signature';
    IF payment_signature IS NULL THEN RETURN jsonb_build_object('error', 'invalid_payment'); END IF;
    next_record := next_record || jsonb_build_object('status', 'paid', 'signature', payment_signature, 'slot', p_data->'slot', 'paidAt', p_data->'now');
  ELSIF p_action = 'start' THEN
    IF current_record->>'status' = 'started' THEN
      IF current_record->>'runId' <> p_data->>'runId' THEN RETURN jsonb_build_object('error', 'payment_already_used'); END IF;
      RETURN jsonb_build_object('record', current_record, 'changed', false);
    END IF;
    IF current_record->>'status' <> 'paid' THEN RETURN jsonb_build_object('error', 'payment_required'); END IF;
    next_record := next_record || jsonb_build_object('status', 'started', 'runId', p_data->'runId', 'startedAt', p_data->'now');
  ELSE RETURN jsonb_build_object('error', 'invalid_action');
  END IF;
  next_record := next_record || jsonb_build_object('revision', (current_record->>'revision')::integer + 1);
  UPDATE public.mezzopollo_arcade_intents SET record = next_record, signature = COALESCE(payment_signature, signature) WHERE intent_id = p_id;
  RETURN jsonb_build_object('record', next_record, 'changed', true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('error', 'payment_already_used');
END;
$body$;

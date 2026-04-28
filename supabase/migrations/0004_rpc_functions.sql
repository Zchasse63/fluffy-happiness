-- ===========================================================================
-- RPC functions — Postgres-side primitives that need transactional safety.
-- ===========================================================================

-- ───── book_class_atomic ────────────────────────────────────────────────
-- Locks the class_instance row, checks capacity vs. current bookings, and
-- inserts the booking in one transaction. Raises sqlstate-coded exceptions
-- so callers can translate them into HTTP status codes.

CREATE OR REPLACE FUNCTION book_class_atomic(
  p_class_instance_id UUID,
  p_member_id         UUID,
  p_studio_id         UUID,
  p_credit_type       TEXT DEFAULT NULL,
  p_source            TEXT DEFAULT 'meridian'
) RETURNS UUID AS $$
DECLARE
  v_capacity     INTEGER;
  v_booked       INTEGER;
  v_existing     UUID;
  v_booking_id   UUID;
BEGIN
  -- Lock the class row to serialize concurrent capacity checks.
  SELECT capacity, booked_count INTO v_capacity, v_booked
  FROM class_instances
  WHERE id = p_class_instance_id AND studio_id = p_studio_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'class_not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Reject double-booking.
  SELECT id INTO v_existing
  FROM bookings
  WHERE class_instance_id = p_class_instance_id
    AND member_id = p_member_id
    AND status IN ('booked','checked_in','waitlisted');
  IF FOUND THEN
    RAISE EXCEPTION 'duplicate_booking' USING ERRCODE = 'P0002';
  END IF;

  IF v_booked >= v_capacity THEN
    RAISE EXCEPTION 'class_full' USING ERRCODE = 'P0003';
  END IF;

  INSERT INTO bookings (studio_id, class_instance_id, member_id, status, source, credit_type_used, glofox_write_status)
  VALUES (p_studio_id, p_class_instance_id, p_member_id, 'booked', p_source, p_credit_type, 'pending')
  RETURNING id INTO v_booking_id;

  UPDATE class_instances
     SET booked_count = booked_count + 1,
         updated_at   = NOW()
   WHERE id = p_class_instance_id;

  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- ───── apply_credit_ledger ─────────────────────────────────────────────
-- Single source of credit truth. Recomputes balance_after and updates the
-- denormalized cache on members in one transaction.

CREATE OR REPLACE FUNCTION apply_credit_ledger(
  p_member_id      UUID,
  p_credit_type    TEXT,
  p_delta          INTEGER,
  p_reason         TEXT,
  p_booking_id     UUID DEFAULT NULL,
  p_transaction_id UUID DEFAULT NULL,
  p_actor_id       UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_studio_id      UUID;
  v_current        INTEGER;
  v_new_balance    INTEGER;
  v_ledger_id      UUID;
BEGIN
  SELECT studio_id INTO v_studio_id FROM members WHERE id = p_member_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Lock member row to serialize concurrent ledger writes.
  PERFORM 1 FROM members WHERE id = p_member_id FOR UPDATE;

  CASE p_credit_type
    WHEN 'membership' THEN SELECT membership_credits INTO v_current FROM members WHERE id = p_member_id;
    WHEN 'flex'       THEN SELECT flex_credits INTO v_current FROM members WHERE id = p_member_id;
    WHEN 'guest_pass' THEN SELECT guest_passes_remaining INTO v_current FROM members WHERE id = p_member_id;
    WHEN 'wallet'     THEN SELECT wallet_balance_cents INTO v_current FROM members WHERE id = p_member_id;
    ELSE RAISE EXCEPTION 'unknown_credit_type' USING ERRCODE = 'P0004';
  END CASE;

  v_new_balance := v_current + p_delta;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'insufficient_balance' USING ERRCODE = 'P0005';
  END IF;

  INSERT INTO credit_ledger (
    studio_id, member_id, credit_type, delta, balance_after, reason,
    booking_id, transaction_id, created_by
  ) VALUES (
    v_studio_id, p_member_id, p_credit_type, p_delta, v_new_balance, p_reason,
    p_booking_id, p_transaction_id, p_actor_id
  ) RETURNING id INTO v_ledger_id;

  UPDATE members
     SET membership_credits      = CASE WHEN p_credit_type = 'membership' THEN v_new_balance ELSE membership_credits END,
         flex_credits            = CASE WHEN p_credit_type = 'flex'       THEN v_new_balance ELSE flex_credits END,
         guest_passes_remaining  = CASE WHEN p_credit_type = 'guest_pass' THEN v_new_balance ELSE guest_passes_remaining END,
         wallet_balance_cents    = CASE WHEN p_credit_type = 'wallet'     THEN v_new_balance ELSE wallet_balance_cents END,
         updated_at              = NOW()
   WHERE id = p_member_id;

  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql;

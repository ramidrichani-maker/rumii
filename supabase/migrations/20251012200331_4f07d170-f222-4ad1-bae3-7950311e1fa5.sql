-- Add 'interested' and 'uninterested' to viewing_status enum if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'interested'
    AND enumtypid = 'viewing_status'::regtype
  ) THEN
    ALTER TYPE viewing_status ADD VALUE 'interested';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'uninterested'
    AND enumtypid = 'viewing_status'::regtype
  ) THEN
    ALTER TYPE viewing_status ADD VALUE 'uninterested';
  END IF;
END $$;
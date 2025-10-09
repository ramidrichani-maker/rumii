-- Add 'successful' status to viewing_status enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'successful' 
    AND enumtypid = 'viewing_status'::regtype
  ) THEN
    ALTER TYPE viewing_status ADD VALUE 'successful';
  END IF;
END $$;
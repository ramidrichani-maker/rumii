-- Make the ai-generated bucket public so images can be displayed
UPDATE storage.buckets SET public = true WHERE id = 'ai-generated';
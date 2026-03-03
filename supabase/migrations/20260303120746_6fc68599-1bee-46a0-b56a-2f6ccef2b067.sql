
-- Create sprites storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('sprites', 'sprites', true);

-- Allow public read access
CREATE POLICY "Public read access for sprites"
ON storage.objects FOR SELECT
USING (bucket_id = 'sprites');

-- Allow service role to insert (edge function uses service role)
CREATE POLICY "Service role can upload sprites"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sprites');

CREATE POLICY "Service role can update sprites"
ON storage.objects FOR UPDATE
USING (bucket_id = 'sprites');

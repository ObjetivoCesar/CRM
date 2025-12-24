-- Enable RLS on client_alerts table
ALTER TABLE client_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to read all alerts
CREATE POLICY "Allow authenticated users to read alerts"
ON client_alerts
FOR SELECT
TO authenticated
USING (true);

-- Policy: Allow authenticated users to insert alerts
CREATE POLICY "Allow authenticated users to insert alerts"
ON client_alerts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Allow authenticated users to update alerts
CREATE POLICY "Allow authenticated users to update alerts"
ON client_alerts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Policy: Allow authenticated users to delete alerts
CREATE POLICY "Allow authenticated users to delete alerts"
ON client_alerts
FOR DELETE
TO authenticated
USING (true);

-- Optional: If you want to allow service role full access
CREATE POLICY "Allow service role full access to alerts"
ON client_alerts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
